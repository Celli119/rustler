use anyhow::{Context, Result};
use windows::Win32::Foundation::HWND;
use windows::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
};
const CF_UNICODETEXT: u32 = 13;
use windows::Win32::System::Memory::{
    GlobalAlloc, GlobalLock, GlobalUnlock,
    GMEM_MOVEABLE,
};
use windows::Win32::Foundation::HANDLE;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VIRTUAL_KEY, VK_CONTROL, VK_V,
};

// Removed as it's now imported from windows::Win32::System::DataExchange

/// Pastes text on Windows using the Win32 API
///
/// # Arguments
/// * `text` - The text to paste
///
/// # Returns
/// * `Ok(())` if the text was pasted successfully
/// * `Err` if the clipboard operation or SendInput failed
pub fn paste_text(text: &str) -> Result<()> {
    log::info!("Pasting text on Windows using Win32 API");

    unsafe {
        // Set clipboard data
        set_clipboard_text(text)?;

        // Simulate Ctrl+V key press
        simulate_paste_shortcut()?;
    }

    log::info!("Text pasted successfully on Windows");
    Ok(())
}

/// Sets text to the Windows clipboard
unsafe fn set_clipboard_text(text: &str) -> Result<()> {
    // Open clipboard
    OpenClipboard(HWND(std::ptr::null_mut())).context("Failed to open clipboard")?;

    // Empty clipboard
    EmptyClipboard().context("Failed to empty clipboard")?;

    // Convert text to UTF-16
    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let size = wide.len() * std::mem::size_of::<u16>();

    // Allocate global memory
    let hglob = GlobalAlloc(GMEM_MOVEABLE, size).context("Failed to allocate global memory")?;

    // Lock memory and copy text
    let locked = GlobalLock(hglob);
    if locked.is_null() {
        let _ = CloseClipboard();
        return Err(anyhow::anyhow!("Failed to lock global memory"));
    }

    std::ptr::copy_nonoverlapping(wide.as_ptr(), locked as *mut u16, wide.len());
    let _ = GlobalUnlock(hglob);

    // Set clipboard data - convert HGLOBAL to HANDLE
    SetClipboardData(CF_UNICODETEXT, HANDLE(hglob.0)).context("Failed to set clipboard data")?;

    CloseClipboard().context("Failed to close clipboard")?;

    Ok(())
}

/// Simulates Ctrl+V key press using SendInput
unsafe fn simulate_paste_shortcut() -> Result<()> {
    let mut inputs: [INPUT; 4] = std::mem::zeroed();

    // Ctrl down
    inputs[0] = create_keyboard_input(VK_CONTROL, false);
    // V down
    inputs[1] = create_keyboard_input(VK_V, false);
    // V up
    inputs[2] = create_keyboard_input(VK_V, true);
    // Ctrl up
    inputs[3] = create_keyboard_input(VK_CONTROL, true);

    let result = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);

    if result != 4 {
        return Err(anyhow::anyhow!("Failed to send input events"));
    }

    Ok(())
}

/// Creates a keyboard input structure
unsafe fn create_keyboard_input(vk: VIRTUAL_KEY, key_up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if key_up {
                    KEYEVENTF_KEYUP
                } else {
                    KEYBD_EVENT_FLAGS(0)
                },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}
