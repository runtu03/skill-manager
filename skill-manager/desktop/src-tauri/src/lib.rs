use std::{
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;
const SERVER_PORT: u16 = 3211;

struct ServerState(Mutex<Option<Child>>);

impl Drop for ServerState {
    fn drop(&mut self) {
        if let Ok(mut child) = self.0.lock() {
            if let Some(child) = child.as_mut() {
                let _ = child.kill();
            }
        }
    }
}

fn project_root() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .unwrap_or(manifest_dir)
}

fn server_root(app: &tauri::App) -> Result<PathBuf, tauri::Error> {
    let resource_dir = app.path().resource_dir()?;
    if resource_dir.join("src").join("server.js").exists() {
        return Ok(resource_dir);
    }

    Ok(project_root())
}

fn start_server(app_dir: &Path, app_data_dir: &Path) -> Child {
    let mut command = Command::new("node");
    command
        .arg("src/server.js")
        .current_dir(app_dir)
        .env("APP_MODE", "desktop")
        .env("APP_DATA_DIR", app_data_dir)
        .env("PORT", SERVER_PORT.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    command
        .spawn()
        .expect("failed to spawn local skill manager server")
}

#[tauri::command]
fn set_launch_at_startup(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())
    } else {
        manager.disable().map_err(|error| error.to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![set_launch_at_startup])
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let child = start_server(&server_root(app)?, &app_data_dir);
            app.manage(ServerState(Mutex::new(Some(child))));

            let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出软件", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true);

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            tray_builder.build(app)?;

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run Tauri app");
}
