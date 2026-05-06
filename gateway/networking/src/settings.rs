#[derive(Clone)]
pub struct Settings {
    pub url_preview: String,
    pub yandex_dick_toke: String,
    pub redis_url: String,
    pub rabbitmq_url: String,
}

impl Settings {
    pub fn new() -> Self {
        let url_preview = std::env::var("PREVIEW_WORKER_URL").unwrap();
        let yandex_dick_toke = std::env::var("YANDEX_DISK_TOKEN").unwrap();
        let redis_url = std::env::var("REDIS_URL").unwrap();
        let rabbitmq_url = std::env::var("RABBITMQ_URL").unwrap();
        Self {
            url_preview,
            yandex_dick_toke,
            redis_url,
            rabbitmq_url,
        }
    }
}
