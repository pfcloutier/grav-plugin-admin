import $ from 'jquery';
import { config, translations } from 'grav-config';
import formatBytes from '../utils/formatbytes';
import { Instance as gpm } from '../utils/gpm';
import './check';
import './update';

export default class Updates {
    constructor(payload = {}) {
        this.setPayload(payload);
        this.task = `task${config.param_sep}`;
    }

    setPayload(payload = {}) {
        this.payload = payload;

        return this;
    }

    fetch(force = false) {
        gpm.fetch((response) => this.setPayload(response), force);

        return this;
    }

    maintenance(mode = 'hide') {
        let element = $('#updates [data-maintenance-update]');

        element[mode === 'show' ? 'fadeIn' : 'fadeOut']();

        if (mode === 'hide') {
            $('.badges.with-updates').removeClass('with-updates').find('.badge.updates').remove();
        }

        return this;
    }

    grav() {
        let payload = this.payload.grav;

        if (payload.isUpdatable) {
            let task = this.task;
            let bar = `
            <i class="fa fa-bullhorn"></i>
            Grav <b>v${payload.available}</b> ${translations.PLUGIN_ADMIN.IS_NOW_AVAILABLE}! <span class="less">(${translations.PLUGIN_ADMIN.CURRENT}v${payload.version})</span>
            `;

            if (!payload.isSymlink) {
                bar += `<button data-maintenance-update="${config.base_url_relative}/update.json/${task}updategrav/admin-nonce${config.param_sep}${config.admin_nonce}" class="button button-small secondary" id="grav-update-button">${translations.PLUGIN_ADMIN.UPDATE_GRAV_NOW}</button>`;
            } else {
                bar += `<span class="hint--left" style="float: right;" data-hint="${translations.PLUGIN_ADMIN.GRAV_SYMBOLICALLY_LINKED}"><i class="fa fa-fw fa-link"></i></span>`;
            }

            $('[data-gpm-grav]').addClass('grav').html(`<p>${bar}</p>`);
        }

        $('#grav-update-button').on('click', function() {
            $(this).html(`${translations.PLUGIN_ADMIN.UPDATING_PLEASE_WAIT} ${formatBytes(payload.assets['grav-update'].size)}..`);
        });

        return this;
    }

    resources() {
        if (!this.payload.resources.total) { return this.maintenance('hide'); }

        let map = ['plugins', 'themes'];
        let singles = ['plugin', 'theme'];
        let { plugins, themes } = this.payload.resources;

        if (!this.payload.resources.total) { return this; }

        [plugins, themes].forEach(function(resources, index) {
            if (!resources || Array.isArray(resources)) { return; }
            let length = Object.keys(resources).length;
            let type = map[index];

            // sidebar
            $(`#admin-menu a[href$="/${map[index]}"]`)
                .find('.badges')
                .addClass('with-updates')
                .find('.badge.updates').text(length);

            // update all
            let title = type.charAt(0).toUpperCase() + type.substr(1).toLowerCase();
            let updateAll = $(`.grav-update.${type}`);
            updateAll.html(`
            <p>
                <i class="fa fa-bullhorn"></i>
                ${length} ${translations.PLUGIN_ADMIN.OF_YOUR} ${type} ${translations.PLUGIN_ADMIN.HAVE_AN_UPDATE_AVAILABLE}

                <a href="#" class="button button-small secondary" data-remodal-target="add-package" data-packages-slugs="${Object.keys(resources).join()}" data-${singles[index]}-action="start-packages-update">${translations.PLUGIN_ADMIN.UPDATE} All ${title}</a>
            </p>
            `);

            Object.keys(resources).forEach(function(item) {
                // listing page
                let element = $(`[data-gpm-${singles[index]}="${item}"] .gpm-name`);
                let url = element.find('a');

                if (type === 'plugins' && !element.find('.badge.update').length) {
                    element.append(`<a class="plugin-update-button" href="${url.attr('href')}"><span class="badge update">${translations.PLUGIN_ADMIN.UPDATE_AVAILABLE}!</span></a>`);
                } else if (type === 'themes') {
                    element.append(`<div class="gpm-ribbon"><a href="${url.attr('href')}">${translations.PLUGIN_ADMIN.UPDATE.toUpperCase()}</a></div>`);
                }

                // details page
                let details = $(`.grav-update.${singles[index]}`);
                if (details.length) {
                    details.html(`
                    <p>
                        <i class="fa fa-bullhorn"></i>
                        <strong>v${resources[item].available}</strong> ${translations.PLUGIN_ADMIN.OF_THIS} ${singles[index]} ${translations.PLUGIN_ADMIN.IS_NOW_AVAILABLE}!
                        <a href="#" class="button button-small secondary" data-remodal-target="add-package" data-packages-slugs="${item}" data-${singles[index]}-action="start-package-installation">${translations.PLUGIN_ADMIN.UPDATE} ${singles[index].charAt(0).toUpperCase() + singles[index].substr(1).toLowerCase()}</a>
                    </p>
                    `);
                }
            });
        });
    }
}

let Instance = new Updates();
export { Instance };

// automatically refresh UI for updates (graph, sidebar, plugin/themes pages) after every fetch
gpm.on('fetched', (response, raw) => {
    Instance.setPayload(response.payload || {});
    Instance.grav().resources();
});

if (config.enable_auto_updates_check === '1') {
    gpm.fetch();
}
