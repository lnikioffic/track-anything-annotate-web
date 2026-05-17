use serde::{Deserialize, Serialize};

#[derive(Deserialize, PartialEq, Serialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum TrackingType {
    Coco,
    Yolo,
    Voc,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Metadata {
    #[serde(rename = "type")]
    pub meta_type: TrackingType,
    pub prompt: serde_json::Value,
}

// #[derive(Deserialize, Serialize, Debug, Clone)]
// #[serde(untagged)]
// pub enum IntOrList {
//     Int(i32),
//     List(Vec<i32>),
// }

// #[derive(Deserialize, Serialize, Debug, Clone)]
// #[serde(untagged)]
// pub enum Coords1DOr2D {
//     Coords1D(Vec<i32>),
//     Coords2D(Vec<Vec<i32>>),
// }

// #[derive(Deserialize, Serialize, Debug, Clone)]
// #[serde(tag = "mode")]
// pub enum Prompt {
//     #[serde(rename = "point")]
//     Point {
//         point_coords: Vec<Coords1DOr2D>,
//         point_labels: Vec<IntOrList>,
//     },
//     #[serde(rename = "box")]
//     Box { boxes: Vec<Vec<i32>> },
//     #[serde(rename = "both")]
//     Both {
//         point_coords: Vec<Coords1DOr2D>,
//         point_labels: Vec<IntOrList>,
//         boxes: Vec<Vec<i32>>,
//     },
// }
