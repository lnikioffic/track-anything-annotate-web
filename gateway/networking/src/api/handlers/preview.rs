use axum::{extract::Multipart, http::StatusCode, response::IntoResponse};
use reqwest::{header, multipart};

pub async fn preview(mut multipart: Multipart) -> impl IntoResponse {
    let url_preview = std::env::var("PREVIEW_WORKER_URL").unwrap();

    let mut file = Vec::new();
    let mut json_data = String::new();
    let mut file_name = String::from("image.jpg");

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();

        match name.as_str() {
            "file" => {
                file_name = field.file_name().unwrap_or("image.jpg").to_string();
                file = field.bytes().await.unwrap_or_default().to_vec();
            }
            "metadata" => {
                json_data = field.text().await.unwrap_or_default();
            }
            _ => {}
        }
    }

    let client = reqwest::Client::new();

    let form = multipart::Form::new()
        .part(
            "file",
            multipart::Part::bytes(file)
                .file_name(file_name)
                .mime_str("image/jpeg")
                .unwrap(),
        )
        .text("json_data", json_data);

    let response = client
        .post(format!("{}/preview", url_preview))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let content_type = res
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/jpeg")
                .to_string();

            let bytes = res.bytes().await.unwrap_or_default();

            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, content_type)],
                bytes,
            )
                .into_response()
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
