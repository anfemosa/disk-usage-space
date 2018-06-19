/*
 * Disk Space Usage
 * This a extension to show disk space usage
 * of mounted devices
 *
 * Copyright (C) 2018
 *     Lorenzo Carbonell <lorenzo.carbonell.cerezo@gmail.com>,
 *
 * This file is part of Disk Space Usage.
 * 
 * WordReference Search Provider is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WordReference Search Provider is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-openweather.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 */

imports.gi.versions.Gdk = "3.0";
imports.gi.versions.St = "1.0";

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;
const Cairo = imports.cairo

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Manager = Extension.imports.dsu.Manager;

function notify(msg, details, icon='disk-space-usage') {
    let source = new MessageTray.Source(Extension.uuid, icon);
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    notification.setTransient(true);
    source.notify(notification);
}

function getColor(keyName){
    let color = new Gdk.RGBA();
    color.parse(getValue(keyName));
    return color;
}

function getValue(keyName){
    return Convenience.getSettings().get_value(keyName).deep_unpack();
}


class DiskSpaceUsageButton extends PanelMenu.Button{
    constructor(){
        super(St.Align.START);
        this._settings = Convenience.getSettings();
        Gtk.IconTheme.get_default().append_search_path(
            Extension.dir.get_child('icons').get_path());

        let box = new St.BoxLayout();

        let icon = new St.Icon({ icon_name: 'disk-space-usage',
                                 style_class: 'system-status-icon' });
        box.add(icon);
        this.actor.add_child(box);

        this.manager = new Manager();

        this.update();
        this.sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
                                                 60,
                                                 this.update.bind(this));
        this._settings.connect("changed", ()=>{
            this.update();
        });
    }

    update(){
        if(this.menu.numMenuItems > 0){
            this.menu.removeAll();

        }
        let columns = getValue('columns');
        let section = new PopupMenu.PopupMenuSection();
        this.manager.update();
        let rows = Math.ceil(this.manager.devices.length/columns);

        let menurows = [];
        for (let i = 0; i < this.manager.devices.length; i++) {

            let currentrow = parseInt(i / columns);
            let currentcolumn = i % columns;


            if(currentcolumn == 0){
                menurows.push(new St.BoxLayout({ vertical: false }));
                //if(i > 0){
                section.actor.add_actor(menurows[currentrow]);
                //}
            }
            let percentage = parseInt(
                this.manager.devices[i].percentage.substring(
                    0, this.manager.devices[i].percentage.length-1));
            /*
            if(percentage > 80){
                notify('Atención',
                       'El dispositivo %s ha superado el %s %'.format(
                            this.manager.devices[i].device, percentage));
            }
            */
            menurows[currentrow].add(
                this.createCanvas(70, 70, this.manager.devices[i]));
        }
        this.menu.addMenuItem(section);
        return true;
    }

    createCanvas(width, heigth, device){
        let text = device.device.substring(5);
        let percentage = parseInt(device.percentage.substring(
            0, device.percentage.length-1));

        let container = new St.BoxLayout({ vertical: true });

        container.add(new St.Label({y_align: Clutter.ActorAlign.CENTER,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    text: text }));
        let canvas = new Clutter.Canvas();

        canvas.set_size (width, heigth);
        canvas.connect('draw', (canvas, cr, width, height) =>{
            cr.save()
            cr.setSourceRGBA(1, 1, 1, 1);
            //cr.setSourceRGB(1, 1, 1);
            cr.rectangle(0, 0, width, height);
            cr.fill();
            cr.setSourceRGBA(0.24, 0.24, 0.24, 1);
            //cr.setSourceRGB(0.24, 0.24, 0.24);
            cr.rectangle(0, 0, width, height);
            cr.fill();
            cr.restore();

            cr.save();
            let linew = width * 0.15;
            cr.setLineWidth(linew);
            cr.setSourceRGB(0.30, 0.30, 0.30);
            cr.arc((width - linew) / 2,
                   (height - linew) / 2,
                   parseInt((width - linew) / 2 * 0.8),
                   0.00001, 0);
            cr.stroke();
            cr.restore();

            cr.save();
            cr.setLineWidth(linew);
            if(percentage < getValue('warning')){
                let color = getColor('normal-color');
                cr.setSourceRGB(color.red, color.green, color.blue);
            }else if(percentage < getValue('danger')){
                let color = getColor('warning-color');
                cr.setSourceRGB(color.red, color.green, color.blue);
            }else{
                let color = getColor('danger-color');
                cr.setSourceRGB(color.red, color.green, color.blue);
            }

            cr.arc((width - linew) / 2,
                   (height - linew) / 2,
                   parseInt((width - linew) / 2 * 0.8),
                   Math.PI * 2* (1 - percentage / 100), 0);
            cr.stroke();
            cr.restore();

            cr.save();

            cr.setSourceRGB(0.85, 0.85, 0.85);
            this.write_centered_text(cr,
                                     width/2,
                                     height/2,
                                     percentage + "%",
                                     'Ubuntu',
                                     width/7)
            cr.restore();

        });
        canvas.invalidate();

        let dummy = new Clutter.Actor();
        dummy.set_content(canvas);
        dummy.set_size(width, heigth);

        container.add(dummy);
        return container;
    }

    write_centered_text(cr, x, y, text, font, size){
        let pg_layout = PangoCairo.create_layout(cr);
        let pg_context = pg_layout.get_context();
        pg_layout.set_font_description(
            Pango.FontDescription.from_string('%s %s'.format(font, size)));
        pg_layout.set_text(text, -1);

        PangoCairo.update_layout(cr, pg_layout);
        let text_size = pg_layout.get_pixel_size();

        cr.moveTo(x - text_size[0]/2, y - size/2);
        cr.setFontSize(size);
        cr.showText(text);
    }

}

let diskSpaceUsageButton;

function init(){
}

function enable(){
    diskSpaceUsageButton = new DiskSpaceUsageButton();
    Main.panel.addToStatusArea('DiskSpaceUsageButton',
                               diskSpaceUsageButton,
                               0,
                               'right');
}

function disable() {
    GLib.source_remove(this.sourceId);
    diskSpaceUsageButton.destroy();
}