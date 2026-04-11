use std::net::SocketAddr;

use axum::Router;
use networking::api;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let app = Router::new();
    let app = api::configure(app);
    
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
