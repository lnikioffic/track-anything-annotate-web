use anyhow::Result;
use async_trait::async_trait;
use bytes::Bytes;

#[async_trait]
pub trait Storage: Send + Sync {
    async fn upload(&self, path: &str, file: Bytes) -> Result<String>;
    async fn download(&self, path: &str) -> Result<Bytes>;
    async fn delete(&self, path: &str) -> Result<()>;
}
