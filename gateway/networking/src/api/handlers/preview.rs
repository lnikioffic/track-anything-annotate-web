use axum::{extract::Multipart, http::StatusCode, response::IntoResponse};
use reqwest::{header, multipart};

pub async fn preview(mut multipart: Multipart) -> impl IntoResponse {
    let url_preview = match std::env::var("PREVIEW_WORKER_URL") {
        Ok(url) => url,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Missing PREVIEW_WORKER_URL",
            )
                .into_response();
        }
    };

    let mut file = Vec::new();
    let mut file_content_type = String::from("image/jpeg");
    let mut json_data = String::new();
    let mut file_name = String::from("image.jpg");

    while let Some(field) = match multipart.next_field().await {
        Ok(Some(f)) => Some(f),
        Ok(None) => None,
        Err(e) => {
            tracing::error!("Multipart read error: {e}");
            return (
                StatusCode::BAD_REQUEST,
                format!("Failed to read multipart field: {e}"),
            )
                .into_response();
        }
    } {
        let name = match field.name() {
            Some(n) => n.to_string(),
            None => continue,
        };
        match name.as_str() {
            "file" => {
                file_name = field.file_name().unwrap_or("image.jpg").to_string();
                if let Some(ct) = field.content_type() {
                    file_content_type = ct.to_string();
                }
                file = match field.bytes().await {
                    Ok(b) => b.to_vec(),
                    Err(e) => {
                        return (
                            StatusCode::BAD_REQUEST,
                            format!("Failed to read file: {e}"),
                        )
                            .into_response();
                    }
                };
            }
            "metadata" => {
                json_data = field.text().await.unwrap_or_default();
            }
            _ => {}
        }
    }

    if file.is_empty() {
        return (StatusCode::BAD_REQUEST, "Missing or empty file").into_response();
    }

    let client = reqwest::Client::new();

    let file_part = multipart::Part::bytes(file)
        .file_name(file_name)
        .mime_str(&file_content_type)
        .expect("valid mime type");

    let form = multipart::Form::new()
        .part("file", file_part)
        .text("json_data", json_data);

    let response = client
        .post(format!("{}/preview", url_preview))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let content_type = res
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/jpeg")
                .to_string();

            let bytes = res.bytes().await.unwrap_or_default();

            axum::response::Response::builder()
                .status(status.as_u16())
                .header(header::CONTENT_TYPE, content_type)
                .body(axum::body::Body::from(bytes))
                .unwrap_or_else(|e| {
                    tracing::error!("Failed to build response: {e}");
                    axum::response::Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(axum::body::Body::from("Response build error"))
                        .unwrap()
                })
        }
        Err(e) => {
            tracing::error!("Worker request failed: {e}");
            (StatusCode::BAD_GATEWAY, format!("Worker error: {e}")).into_response()
        }
    }
}
