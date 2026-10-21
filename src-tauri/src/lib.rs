// Der mobile Einstiegspunkt wird nur kompiliert, wenn wir für Android oder iOS bauen
#[cfg_with::cfg_with(any(target_os = "android", target_os = "ios"))]
#[tauri::mobile_entry_point]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Der reguläre Einstiegspunkt für Windows, Linux und macOS Desktop
#[cfg_with::cfg_with(not(any(target_os = "android", target_os = "ios")))]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}