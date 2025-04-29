export interface LitModules {
    lit: {
        html: any;
        css: any;
        nothing: any;
        render: (template: any, container: any, options?: any) => void;
    };
    litDirectives: {
        styleMap: (styles: Record<string, string>) => any;
        repeat: (items: any[], keyFn: (item: any) => any, template: (item: any, index: any) => any) => any;
        classMap: (classes: Record<string, boolean>) => any;
    };
    litDecorators: {
        customElement: (tagName: string) => (cls: any) => void;
        property: (options?: any) => (proto: any, name: string) => void;
        state: (proto: any, name: string) => void;
    };
    litControllers: {
        ReactiveController: any;
        ReactiveControllerHost: any;
    };
}
export declare function loadHaLit(): Promise<LitModules>;
export declare function setupLitRenderer(litModules: LitModules): any;
