// Helper file to load Lit libraries from Home Assistant frontend
// This avoids bare specifier imports which can cause issues in browsers

// Define a type for the Lit modules we need
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

// Function to load Lit libraries from Home Assistant frontend
export async function loadHaLit(): Promise<LitModules> {
  // Check if we're in Home Assistant
  if (!window.customElements || !window.customElements.get('home-assistant')) {
    throw new Error('Not running in Home Assistant');
  }

  // Try to get the Home Assistant frontend
  const hassMain = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
  if (!hassMain) {
    throw new Error('Could not find Home Assistant main element');
  }

  // Try to get the Home Assistant application from the main element
  const haApp = hassMain.shadowRoot?.querySelector('ha-panel-lovelace');
  if (!haApp) {
    throw new Error('Could not find Home Assistant Lovelace panel');
  }

  // Access the frontend modules if available
  const frontend = (window as any).frontendVersion !== undefined ? 
    (window as any).frontend : 
    (haApp as any)?.___frontend;

  if (!frontend) {
    throw new Error('Could not access Home Assistant frontend');
  }

  // Get the Lit modules from the frontend
  const lit = await frontend.import('./lit');
  const litDirectives = await frontend.import('./lit/directives');
  const litDecorators = await frontend.import('./lit/decorators');
  const litControllers = await frontend.import('./lit/controllers');

  return {
    lit: {
      html: lit.html,
      css: lit.css,
      nothing: lit.nothing,
      render: lit.render
    },
    litDirectives: {
      styleMap: litDirectives.styleMap,
      repeat: litDirectives.repeat,
      classMap: litDirectives.classMap
    },
    litDecorators: {
      customElement: litDecorators.customElement,
      property: litDecorators.property,
      state: litDecorators.state
    },
    litControllers: {
      ReactiveController: litControllers.ReactiveController,
      ReactiveControllerHost: litControllers.ReactiveControllerHost
    }
  };
}

// Function to set up a Lit renderer with the loaded modules
export function setupLitRenderer(litModules: LitModules): any {
  const { lit, litDirectives } = litModules;
  
  // Return an object with rendering functions
  return {
    html: lit.html,
    render: lit.render,
    nothing: lit.nothing,
    styleMap: litDirectives.styleMap,
    repeat: litDirectives.repeat,
    classMap: litDirectives.classMap,
    
    // Function to provide hass to the component
    provideHass: (element: any) => {
      // This would be implemented based on how your card needs to access hass
      return element;
    },
    
    // Helper for creating a Lit render function
    createRenderFunction: (element: any) => {
      return (template: any) => {
        lit.render(template, element.renderRoot, {
          eventContext: element
        });
      };
    }
  };
}