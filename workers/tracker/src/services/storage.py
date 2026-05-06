import aiofiles
import yadisk
from aiohttp import ClientSession, ClientTimeout


class YndexDiskStorage:
    def __init__(self, token: str) -> None:
        self._client = yadisk.AsyncClient(token=token, session='aiohttp')

    async def download(self, path: str, path_file: str):
        async with aiofiles.open(f'{path_file}', 'wb') as f:
            await self._client.download(path, f)

    async def upload(self, path: str, path_file: str):
        async with aiofiles.open(f'{path_file}', 'rb') as f:
            await self._client.upload(f, path)

    async def close(self):
        await self._client.close()


class YandexDiskStorageHTTP:
    API_BASE_URL = 'https://cloud-api.yandex.net/v1/disk/resources'

    def __init__(self, token: str) -> None:
        self._headers = {
            'Authorization': f'OAuth {token}',
            'User-Agent': 'Yandex.Disk {"os":"windows"}',
        }
        self._client = ClientSession(headers=self._headers)

    async def download(self, path: str, path_file: str):
        async with self._client.get(
            f'{self.API_BASE_URL}/download',
            params={'path': path},
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()
            download_url = data['href']

        async with self._client.get(download_url) as resp:
            resp.raise_for_status()
            async with aiofiles.open(f'{path_file}', 'wb') as f:
                async for chunk in resp.content.iter_chunked(1024 * 32):
                    await f.write(chunk)

    async def upload(self, path: str, path_file: str):
        params = {'path': path, 'overwrite': 'true'}
        async with self._client.get(
            f'{self.API_BASE_URL}/upload',
            params=params,
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()
            upload_url = data.get('href')
            if not upload_url:
                raise ValueError(f'No upload URL in response: {data}')

        upload_timeout = ClientTimeout(total=None, connect=30, sock_read=300)
        async with aiofiles.open(path_file, 'rb') as f:
            async with self._client.put(
                upload_url,
                data=f,
                timeout=upload_timeout,
            ) as resp:
                resp.raise_for_status()

    async def close(self):
        await self._client.close()
