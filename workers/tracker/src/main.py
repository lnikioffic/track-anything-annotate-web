import asyncio
import json
from pathlib import Path

from faststream import FastStream
from faststream.rabbit import Channel, RabbitBroker, RabbitMessage, RabbitQueue
from ml_core import AnnotationItem

from src.annotate_json import tracking
from src.config import settings
from src.dataset_export.config import SAVE_FOLDER
from src.services.redis import RedisService
from src.services.storage import YndexDiskStorage

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
    try:
        task_id = data['task_id']
        storage_path = data['storage_path']
        metadata = json.loads(data['metadata'])
        export_type = metadata['type']
        items: list[AnnotationItem] = [
            AnnotationItem(**x) for x in metadata['prompt']
        ]
        await redis.set_status(task_id, 'processing')
        await storage.download(storage_path, path_file)

        path_zip = await asyncio.to_thread(
            tracking,
            path_file,
            export_type,
            items,
            task_id,
        )
        print(path_zip)

        await storage.upload(f'video/{task_id}.zip', path_zip)
        await redis.set_status(task_id, 'done')
        await msg.ack()
    except Exception as e:
        print('ERROR:', repr(e))
        await msg.nack(requeue=True)
    finally:
        await storage.close()
        Path(path_file).unlink(missing_ok=True)
        if path_zip:
            Path(path_zip).unlink(missing_ok=True)
