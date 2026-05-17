use std::sync::Arc;
use storage_core::Storage;
use yandex_disk::YandexDiskStorage;

use crate::{
    services::{rebbitmq::RabbitmqService, redis::RedisService},
    settings::Settings,
};

#[derive(Clone)]
pub struct AppState {
    pub settings: Arc<Settings>,
    pub redis_service: Arc<RedisService>,
    pub storage: Arc<dyn Storage>,
    pub rabbitmq_service: Arc<RabbitmqService>,
}

impl AppState {
    pub async fn new() -> Self {
        let settings = Settings::new();
        let redis_service = RedisService::new(&settings.redis_url);

        let storage = YandexDiskStorage::new(&settings.yandex_dick_toke);
        let rabbitmq_service = RabbitmqService::new(&settings.rabbitmq_url).await;

        AppState {
            settings: Arc::new(settings),
            redis_service: Arc::new(redis_service),
            storage: Arc::new(storage),
            rabbitmq_service: Arc::new(rabbitmq_service),
        }
    }
}
