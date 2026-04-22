use std::sync::Arc;

use axum::{
    extract::{Multipart, State},
    http::{HeaderMap, StatusCode},
};
use reqwest::{header, multipart};

use crate::{error::AppError, response::AppResponse, state::AppState};

pub async fn preview(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<AppResponse<()>, AppError> {
    let url_preview = state.settings.url_preview.clone();

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
        .await?;

    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response.bytes().await?;

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, content_type.parse().unwrap());

    Ok(AppResponse::Binary {
        status: StatusCode::OK,
        headers,
        body: bytes,
    })
}
