import asyncio
import json
import logging
import multiprocessing
from pathlib import Path
from queue import Empty

from faststream import FastStream
from faststream.rabbit import Channel, RabbitBroker, RabbitMessage, RabbitQueue
from ml_core import AnnotationItem

from src.annotate_json import tracking
from src.config import settings
from src.dataset_export.config import SAVE_FOLDER
from src.services.redis import RedisService
from src.services.storage import YndexDiskStorage

logger = logging.getLogger(__name__)


def _run_tracking(
    path_file: str,
    export_type: str,
    items: list,
    task_id: str,
    result_queue: multiprocessing.Queue,
) -> None:
    try:
        result = tracking(path_file, export_type, items, task_id)
        result_queue.put(('ok', str(result)))
    except Exception as e:
        result_queue.put(('err', repr(e)))


def get_tracking_result(result_queue: multiprocessing.Queue) -> str:
    try:
        kind, value = result_queue.get_nowait()
    except Empty as err:
        raise RuntimeError(
            'no result from tracking process',
        ) from err

    if kind == 'err':
        raise RuntimeError(value)

    return value


async def set_error_status(
    redis: RedisService,
    task_id: str | None,
) -> None:
    if not task_id:
        return

    try:
        await redis.set_status(task_id, 'error')
    except Exception:
        logger.exception('failed to set error status')


broker = RabbitBroker(
    settings.RABBITMQ_URL,
    default_channel=Channel(prefetch_count=1),
)
app = FastStream(broker)
queue = RabbitQueue(
    name='tracking',
    durable=True,
)


@broker.subscriber(queue)
async def handle_message(data: dict, msg: RabbitMessage):
    storage = YndexDiskStorage(settings.YANDEX_DISK_TOKEN)
    redis = RedisService(settings.REDIS_URL, 600)
    path_file = str(SAVE_FOLDER / 'video.mp4')
    path_zip = None
    process = None
    result_queue = None
    try:
        task_id = data['task_id']
        current_status = await redis.get_status(task_id)

        if current_status == 'cancelled':
            await msg.ack()
            return

        await redis.set_status(task_id, 'processing')
        storage_path = data['storage_path']
        metadata = json.loads(data['metadata'])
        export_type = metadata['type']
        items: list[AnnotationItem] = [
            AnnotationItem(**x) for x in metadata['prompt']
        ]

        await storage.download(storage_path, path_file)

        # Use a separate process to avoid GIL for CPU-bound tracking
        result_queue = multiprocessing.Queue()
        process = multiprocessing.Process(
            target=_run_tracking,
            args=(path_file, export_type, items, task_id, result_queue),
        )
        process.start()

        while process.is_alive():
            await asyncio.sleep(2)
            current_status = await redis.get_status(task_id)
            if current_status == 'cancelled':
                process.terminate()
                process.join(timeout=10)
                if process.is_alive():
                    process.kill()
                await msg.ack()
                return

        process.join()

        path_zip = get_tracking_result(result_queue)

        await storage.upload(f'video/{task_id}.zip', path_zip)
        await redis.set_status(task_id, 'done')
        await msg.ack()
    except Exception as e:
        print('ERROR:', repr(e))
        if process and process.is_alive():
            process.terminate()
            process.join(timeout=5)
        # Устанавливаем статус ошибки и подтверждаем сообщение.
        await set_error_status(redis, task_id)
        await msg.ack()
    finally:
        await storage.close()
        Path(path_file).unlink(missing_ok=True)
        if path_zip:
            Path(path_zip).unlink(missing_ok=True)
