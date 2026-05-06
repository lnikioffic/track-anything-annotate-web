from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    YANDEX_DISK_TOKEN: str
    REDIS_URL: str
    RABBITMQ_URL: str

    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=False,
        env_file_encoding='utf-8',
        extra='ignore',
    )


settings = Settings()
