use anyhow::{Context, Result, anyhow};
use async_trait::async_trait;
use bytes::Bytes;
use reqwest::{Client, StatusCode, header};
use serde::Deserialize;
use storage_core::Storage;
use url::Url;

const API_BASE_URL: &str = "https://cloud-api.yandex.net/v1/disk/resources";

#[derive(Clone)]
pub struct YandexDiskStorage {
    client: Client,
    token: String,
}

#[derive(Deserialize)]
struct UploadLinkResponse {
    href: String,
}

#[derive(Deserialize)]
struct DownloadLinkResponse {
    href: String,
}

impl YandexDiskStorage {
    pub fn new(token: &str) -> Self {
        Self {
            client: Client::new(),
            token: token.to_string(),
        }
    }

    fn auth(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        request.header("Authorization", format!("OAuth {}", self.token))
    }
}

#[async_trait]
impl Storage for YandexDiskStorage {
    async fn upload(&self, path: &str, file: Bytes) -> Result<String> {
        let upload_url = Url::parse_with_params(
            &format!("{API_BASE_URL}/upload"),
            &[("path", path), ("overwrite", "true")],
        )
        .context("failed to build Yandex Disk upload URL")?;

        let response = self
            .auth(self.client.get(upload_url))
            .send()
            .await
            .context("failed to request upload URL from Yandex Disk")?
            .error_for_status()
            .context("yandex disk upload URL request failed")?;

        let upload_link: UploadLinkResponse = response
            .json()
            .await
            .context("failed to parse Yandex Disk upload URL response")?;

        let href =
            Url::parse(&upload_link.href).context("invalid upload href returned by Yandex Disk")?;

        let _upload_response = self
            .client
            .put(href)
            .header(header::CONTENT_TYPE, "application/octet-stream")
            .body(file)
            .send()
            .await
            .context("failed to upload file to Yandex Disk")?
            .error_for_status()
            .context("yandex disk upload failed")?;

        Ok(path.to_string())
    }

    async fn download(&self, path: &str) -> Result<Bytes> {
        let download_url =
            Url::parse_with_params(&format!("{API_BASE_URL}/download"), &[("path", path)])
                .context("failed to build Yandex Disk download URL")?;

        let response = self
            .auth(self.client.get(download_url))
            .send()
            .await
            .context("failed to request download URL from Yandex Disk")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(anyhow!(
                "yandex disk download URL request failed: {status} {body}"
            ));
        }

        let download_link: DownloadLinkResponse = response
            .json()
            .await
            .context("failed to parse Yandex Disk download URL response")?;

        let file_response = self
            .client
            .get(download_link.href)
            .send()
            .await
            .context("failed to download file from Yandex Disk")?;

        if !file_response.status().is_success() {
            let status = file_response.status();
            let body = file_response.text().await.unwrap_or_default();
            return Err(anyhow!("yandex disk file download failed: {status} {body}"));
        }

        file_response
            .bytes()
            .await
            .context("failed to read downloaded file body")
    }

    async fn delete(&self, path: &str) -> Result<()> {
        let delete_url =
            Url::parse_with_params(API_BASE_URL, &[("path", path), ("permanently", "true")])
                .context("failed to build Yandex Disk delete URL")?;

        let response = self
            .auth(self.client.delete(delete_url))
            .send()
            .await
            .context("failed to delete file from Yandex Disk")?;

        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::ACCEPTED => Ok(()),
            status => {
                let body = response.text().await.unwrap_or_default();
                Err(anyhow!("yandex disk delete failed: {status} {body}"))
            }
        }
    }
}
