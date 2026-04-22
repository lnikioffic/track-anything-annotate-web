use redis::{AsyncCommands, Client};
use uuid::Uuid;

pub struct RedisService {
    client: Client,
}

impl RedisService {
    pub fn new(url: &str) -> Self {
        Self {
            client: Client::open(url).unwrap(),
        }
    }

    pub async fn set_task_status(&self, id: Uuid, status: &str) -> Result<(), redis::RedisError> {
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        let key = format!("task:{}:status", id);
        let _: () = connection.set(key, status).await?;
        Ok(())
    }

    pub async fn get_task_status(&self, id: Uuid) -> Result<Option<String>, redis::RedisError> {
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        let key = format!("task:{}:status", id);
        let value = connection.get(key).await?;
        Ok(value)
    }
}
