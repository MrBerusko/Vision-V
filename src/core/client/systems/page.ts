import * as alt from 'alt-client';
import * as native from 'natives';
import { AthenaClient } from '@AthenaClient/api/athena';
import { isAnyMenuOpen } from '@AthenaClient/utility/menus';
import { GameplayCamera } from './gameplayCamera';
import { PauseMenu } from './pauseMenu';
import { BaseKeyInfo, KeyInfo } from '@AthenaClient/interface/hotkeys';

type AnyCallback = ((...args: any[]) => void) | ((...args: any[]) => Promise<void>) | Function;

export interface IPage {
    /**
     * The full name of the Vue file you are trying to load.
     *
     * @type {string}
     * @memberof IPage
     */
    name: string;

    /**
     * Events to call when the page is opened.
     *
     * @memberof IPage
     */
    callbacks: {
        /**
         * Function to call when the View is loaded.
         * Usually used to pass data to the WebView after it's ready.
         */
        onReady: AnyCallback;
        /**
         * Function to call when the View is closed.
         */
        onClose: AnyCallback;
    };

    options?: {
        /**
         * Disable the escape key auto-close bind.
         *
         * @type {boolean}
         */
        disableEscapeKey?: boolean;
        onOpen?: {
            /**
             * Focus the WebView when this page is opened.
             *
             * @type {boolean}
             */
            focus?: boolean;

            /**
             * Show the cursor when the WebView is focused?
             *
             * @type {boolean}
             */
            showCursor?: boolean;

            /**
             * Hide the HUD when the WebView is opened.
             *
             * @type {boolean}
             */
            hideHud?: boolean;

            /**
             * Hide overlays when the WebView is opened.
             *
             * @type {boolean}
             */
            hideOverlays?: boolean;

            /**
             * Disable game controls on open?
             *
             * @type {boolean}
             */
            disableControls?: 'all' | 'camera' | 'none';

            /**
             * Disable pause menu while this page is open?
             *
             * @type {boolean}
             */
            disablePauseMenu?: boolean;

            /**
             * Blur the game.
             *
             * @type {boolean}
             */
            blurBackground?: boolean;

            /**
             * Sets alt.Player.local.isMenuOpen to false if false.
             *
             * @type {boolean}
             */
            setIsMenuOpenToTrue?: boolean;
        };
        onClose?: {
            /**
             * Unfocus the WebView when it is closed?
             *
             * @type {boolean}
             */
            unfocus?: boolean;

            /**
             * Hide the cursor when the WebView is closed?
             *
             * @type {boolean}
             */
            hideCursor?: boolean;

            /**
             * Show the HUD when the WebView is closed?
             *
             * @type {boolean}
             */
            showHud?: boolean;

            /**
             * Show overlays when the WebView is closed?
             *
             * @type {boolean}
             */
            showOverlays?: boolean;

            /**
             * Enable game controls on close.
             *
             * @type {boolean}
             */
            enableControls?: boolean;

            /**
             * Enable the pause menu on close?
             *
             * @type {boolean}
             */
            enablePauseMenu?: boolean;

            /**
             * Unblur the game.
             *
             * @type {boolean}
             */
            unblurBackground?: boolean;

            /**
             * Sets alt.Player.local.isMenuOpen to false if true.
             *
             * @type {boolean}
             */
            setIsMenuOpenToFalse?: boolean;
        };
    };

    /**
     * An optional hotkey to open / close the page.
     * Set `useSameKeyToClose` to true to force the same key to close the interface.
     *
     * @type {(BaseKeyInfo & { useSameKeyToClose?: boolean })}
     * @memberof IPage
     */
    keybind?: BaseKeyInfo & { useSameKeyToClose?: boolean };
}

export class Page {
    private info: IPage;

    /**
     * Creates a WebView Page Controller
     * @param {IPage} page
     * @memberof Page
     */
    constructor(page: IPage) {
        this.info = page;

        if (this.info.keybind) {
            if (this.info.keybind.delayedKeyDown && this.info.keybind.delayedKeyDown.msToTrigger) {
                AthenaClient.hotkeys.add({
                    ...this.info.keybind,
                    delayedKeyDown: {
                        msToTrigger: this.info.keybind.delayedKeyDown.msToTrigger,
                        callback: this.open.bind(this),
                    },
                });
            } else {
                AthenaClient.hotkeys.add({
                    ...this.info.keybind,
                    keyDown: this.open.bind(this),
                    delayedKeyDown: undefined,
                });
            }
        }

        if (page.options && page.options.disableEscapeKey) {
            AthenaClient.webview.disableEscapeKey(this.info.name);
        }

        AthenaClient.webview.ready(page.name, page.callbacks.onReady);
    }

    /**
     * Open this WebView Page
     *
     * @return {Promise<boolean>}
     * @memberof Page
     */
    async open(): Promise<boolean> {
        if (this.info.keybind && this.info.keybind.useSameKeyToClose) {
            if (AthenaClient.webview.isPageOpen(this.info.name)) {
                this.close(true);
                return false;
            }
        }

        if (isAnyMenuOpen()) {
            return false;
        }

        if (alt.isConsoleOpen()) {
            return false;
        }

        if (alt.isMenuOpen()) {
            return false;
        }

        if (this.info.options.onOpen.focus) {
            AthenaClient.webview.focus();
        }

        const hideOverlays = this.info.options.onOpen.hideOverlays === false ? false : true;

        if (this.info.options.onOpen.hideHud) {
            AthenaClient.webview.showOverlays(false);
        }

        if (this.info.options.onOpen.showCursor) {
            AthenaClient.webview.showCursor(true);
        }

        switch (this.info.options.onOpen.disableControls) {
            case 'all':
                alt.toggleGameControls(false);
                break;
            case 'camera':
                GameplayCamera.disable();
                break;
            default:
                break;
        }

        if (this.info.options.onOpen.disablePauseMenu) {
            PauseMenu.disable();
        }

        if (this.info.options.onOpen.hideHud) {
            native.displayRadar(false);
            native.displayHud(false);
        }

        if (this.info.options.onOpen.blurBackground) {
            native.triggerScreenblurFadeIn(250);
        }

        if (this.info.options.onOpen.setIsMenuOpenToTrue) {
            alt.Player.local.isMenuOpen = true;
        }

        await AthenaClient.webview.open([this.info.name], hideOverlays, this.close.bind(this));
        return true;
    }

    /**
     * If `isManuallyTriggered` is set to true.
     * This means that the close event is not coming from the 'Escape' key bind.
     * Useful for when you want your own exit functionality for your WebView.
     *
     * @param {boolean} [isManuallyTriggered=false]
     * @memberof Page
     */
    close(isManuallyTriggered = false) {
        const showOverlays = this.info.options.onClose.showOverlays === false ? false : true;

        if (isManuallyTriggered) {
            AthenaClient.webview.close([this.info.name], showOverlays);
        }

        if (!isManuallyTriggered && showOverlays) {
            AthenaClient.webview.showOverlays(true, false);
        }

        if (this.info.options.onClose.hideCursor) {
            AthenaClient.webview.showCursor(false);
        }

        if (this.info.options.onClose.unfocus) {
            AthenaClient.webview.unfocus();
        }

        if (this.info.options.onClose.unblurBackground) {
            native.triggerScreenblurFadeOut(250);
        }

        if (this.info.options.onClose.setIsMenuOpenToFalse) {
            alt.Player.local.isMenuOpen = false;
        }

        if (this.info.options.onClose.showHud) {
            native.displayRadar(true);
            native.displayHud(true);
        }

        if (this.info.options.onClose.enablePauseMenu) {
            PauseMenu.enable();
        }

        if (this.info.options.onClose.enableControls) {
            alt.toggleGameControls(true);
            GameplayCamera.enable();
        }

        this.info.callbacks.onClose();
    }
}