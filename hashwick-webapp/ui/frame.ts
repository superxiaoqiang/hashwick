import layout = require("./layout");
import SettingsDialog = require("./settingsDialog");
import statusIcon_ = require("./statusIcon");
if (0) statusIcon_;
import StatusIcon = statusIcon_.StatusIcon;


export function init() {
    addHeaderItem("Layout", layout.showLayoutMenu);
    addHeaderItem("Settings", () => { new SettingsDialog().show(); });
}

function addHeaderItem(text: string, onClick: (event: Event) => void) {
    return $("<li>")
        .append($('<a href="#"></a>')
            .text(text)
            .on("click", (event) => {
                event.preventDefault();
                onClick(event);
            }))
        .appendTo($("#app-header-items"));
}

export function addFooterIcon(title: string, iconURL: string) {
    var icon = new StatusIcon(title, iconURL);
    $("#app-footer-icons").append($("<li>").append($("<a>").append(icon.iconElement)));
    return icon;
}

export function removeFooterIcon(icon: StatusIcon) {
    icon.iconElement.closest("li").remove();
}
