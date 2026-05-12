#[cfg(not(debug_assertions))]
use crate::state::AppState;
#[cfg(not(debug_assertions))]
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, Window, WindowEvent,
};

const MAIN_WINDOW_LABEL: &str = "main";
pub const TRAY_ICON_ID: &str = "main-tray";
const TRAY_SHOW_ID: &str = "tray-show";
const TRAY_EXIT_ID: &str = "tray-exit";

fn tray_labels(locale: Option<&str>) -> (&'static str, &'static str) {
    match locale.unwrap_or("zh-CN") {
        "ru" => ("Открыть Kiro Account Manager", "Выйти"),
        "en" => ("Open Kiro Account Manager", "Quit"),
        _ => ("显示窗口", "退出应用"),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayMenuAction {
    ShowMainWindow,
    ExitApp,
}
//托盘菜单
pub fn tray_menu_action(id: &str) -> Option<TrayMenuAction> {
    match id {
        TRAY_SHOW_ID => Some(TrayMenuAction::ShowMainWindow),
        TRAY_EXIT_ID => Some(TrayMenuAction::ExitApp),
        _ => None,
    }
}

#[cfg(any(test, not(debug_assertions)))]
pub fn should_hide_window_on_close(label: &str, tray_ready: bool) -> bool {
    tray_ready && label == MAIN_WINDOW_LABEL
}

#[cfg(not(debug_assertions))]
fn tray_is_ready<R: Runtime>(window: &Window<R>) -> bool {
    window
        .state::<AppState>()
        .tray_ready
        .load(Ordering::Relaxed)
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn handle_tray_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match tray_menu_action(event.id().as_ref()) {
        Some(TrayMenuAction::ShowMainWindow) => show_main_window(app),
        Some(TrayMenuAction::ExitApp) => app.exit(0),
        None => {}
    }
}

fn handle_tray_icon_event<R: Runtime>(tray: &TrayIcon<R>, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
        | TrayIconEvent::DoubleClick {
            button: MouseButton::Left,
            ..
        } => show_main_window(tray.app_handle()),
        _ => {}
    }
}

pub fn create_tray_icon<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<TrayIcon<R>> {
    let locale = crate::commands::app_settings_cmd::get_app_settings_inner()
        .ok()
        .and_then(|settings| settings.locale)
        .unwrap_or_else(|| "zh-CN".to_string());
    let (show_label, exit_label) = tray_labels(Some(locale.as_str()));
    let show_item = MenuItem::with_id(app, TRAY_SHOW_ID, show_label, true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let exit_item = MenuItem::with_id(app, TRAY_EXIT_ID, exit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &separator, &exit_item])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ICON_ID)
        .menu(&menu)
        .tooltip("Kiro Account Manager")
        .show_menu_on_left_click(false)
        .on_menu_event(handle_tray_menu_event)
        .on_tray_icon_event(handle_tray_icon_event);

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }
    builder.build(app)
}

pub fn handle_window_event<R: Runtime>(_window: &Window<R>, event: &WindowEvent) {
    let _ = (_window, event);
}

#[tauri::command]
pub async fn set_tray_locale(app: AppHandle, locale: String) -> Result<(), String> {
    let (show_label, exit_label) = tray_labels(Some(locale.as_str()));
    let show_item = MenuItem::with_id(&app, TRAY_SHOW_ID, show_label, true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let separator = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let exit_item = MenuItem::with_id(&app, TRAY_EXIT_ID, exit_label, true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&show_item, &separator, &exit_item])
        .map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{should_hide_window_on_close, tray_menu_action, TrayMenuAction};

    #[test]
    fn tray_behavior_maps_known_menu_ids() {
        assert_eq!(
            tray_menu_action("tray-show"),
            Some(TrayMenuAction::ShowMainWindow)
        );
        assert_eq!(tray_menu_action("tray-exit"), Some(TrayMenuAction::ExitApp));
        assert_eq!(tray_menu_action("unknown"), None);
    }

    #[test]
    fn tray_behavior_only_hides_main_window_when_tray_is_ready() {
        assert!(should_hide_window_on_close("main", true));
        assert!(!should_hide_window_on_close("main", false));
        assert!(!should_hide_window_on_close("auth-popup", true));
    }
}
