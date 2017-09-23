import {Optional, Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/map";
import {fromPromise} from "rxjs/observable/fromPromise";
import {of} from "rxjs/observable/of";
import {TrumbowygConfig} from "./trumbowyg.config";
import {LoadExternalFiles} from "./load-external-file.service";

const JQUERY_SCRIPT_URL = 'https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js';
const TRUMBOWYG_PREFIX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Trumbowyg/2.7.0';
const TRUMBOWYG_PLUGINS_PREFIX = TRUMBOWYG_PREFIX_URL + '/plugins';
const TRUMBOWYG_STYLES_URL = TRUMBOWYG_PREFIX_URL + '/ui/trumbowyg.min.css';
const TRUMBOWYG_SCRIPT_URL = TRUMBOWYG_PREFIX_URL + '/trumbowyg.min.js';

declare const window: any;

@Injectable()
export class TrumbowygService {

  private isLoaded$: Observable<boolean>;
  private loadedLangs: Array<string> = [];

  constructor(
    private loadFiles: LoadExternalFiles,
    @Optional() config: TrumbowygConfig
  ) {
    const pluginFiles = this.parsePlugins(config);
    const trumbowygLoadPromise = loadFiles.load(
      TRUMBOWYG_STYLES_URL, TRUMBOWYG_SCRIPT_URL, ...pluginFiles);

    const loadFiles$ = window && window["jQuery"] && window["jQuery"]().on ?
      fromPromise(trumbowygLoadPromise)
      : fromPromise(loadFiles.load(JQUERY_SCRIPT_URL))
        .switchMap(() => fromPromise(trumbowygLoadPromise));

    this.isLoaded$ = loadFiles$
      .map(() => true)
      .publishReplay(1)
      .refCount();
  }

  private parsePlugins(config: TrumbowygConfig): string[] {
    if (!config ||  !Array.isArray(config.plugins)) { return []; }

    return config.plugins.map(
      (plugin: string) => `${TRUMBOWYG_PLUGINS_PREFIX}/${plugin}/trumbowyg.${plugin}.min.js`);
  }

  private loadLang(lang: string): Observable<any> {
    if(this.loadedLangs.indexOf(lang) < 0)
      return fromPromise(
        this.loadFiles.load(`${TRUMBOWYG_PREFIX_URL}/langs/${lang}.min.js`)
          .then(() => {
            this.loadedLangs.push(lang);
            return true;
          })
      );
    return fromPromise(Promise.resolve(true));
  }

  public loaded(lang?: string): Observable<boolean> {
    return this.isLoaded$
      .switchMap(() => {
        if(lang) return this.loadLang(lang);
        else return of(true);
      })
  }
}
