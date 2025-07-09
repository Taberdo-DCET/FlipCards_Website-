// Disable right-click
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

// Block common DevTools shortcuts
document.addEventListener("keydown", function (e) {
  // F12
  if (e.key === "F12") {
    e.preventDefault();
  }

  // Ctrl+Shift+I or Cmd+Opt+I
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i") {
    e.preventDefault();
  }

  // Ctrl+Shift+J or Cmd+Opt+J
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "j") {
    e.preventDefault();
  }

  // Ctrl+U or Cmd+U (View Source)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
    e.preventDefault();
  }
});
