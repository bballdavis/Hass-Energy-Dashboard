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

  // Access the frontend modules directly if available in window
  if ((window as any).frontendVersion !== undefined && (window as any).frontend) {
    return await loadLitFromFrontend((window as any).frontend);
  }

  // Try multiple approaches to find the frontend
  // Approach 1: Direct window access
  const windowAny = window as any;
  if (windowAny.hassConnection && windowAny.hassConnection.conn && 
      windowAny.hassConnection.conn.__hass && 
      windowAny.hassConnection.conn.__hass.hassCore && 
      windowAny.hassConnection.conn.__hass.hassCore.frontend) {
    return await loadLitFromFrontend(windowAny.hassConnection.conn.__hass.hassCore.frontend);
  }

  // Approach 2: Find through DOM
  // Try to get the Home Assistant frontend via DOM traversal
  const hassMain = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
  if (!hassMain) {
    throw new Error('Could not find Home Assistant main element');
  }

  // Try different paths to find the frontend
  const haApp = hassMain.shadowRoot?.querySelector('ha-panel-lovelace');
  if (haApp) {
    // Check for ___frontend property
    const frontend = (haApp as any)?.___frontend;
    if (frontend) {
      return await loadLitFromFrontend(frontend);
    }
    
    // Check for _lovelace property
    const lovelace = (haApp as any)?._lovelace;
    if (lovelace && lovelace.frontend) {
      return await loadLitFromFrontend(lovelace.frontend);
    }
  }

  // Approach 3: Look for ha-panel-frontend element
  const haFrontendPanel = hassMain.shadowRoot?.querySelector('ha-panel-frontend');
  if (haFrontendPanel && (haFrontendPanel as any).frontend) {
    return await loadLitFromFrontend((haFrontendPanel as any).frontend);
  }

  // Approach 4: Try to find any element with frontend property
  for (const selector of ['ha-app-layout', 'home-assistant-main', 'ha-panel-lovelace']) {
    const el = document.querySelector(selector) as any;
    if (el && el.frontend) {
      return await loadLitFromFrontend(el.frontend);
    }
  }

  // Last resort: try to find _frontend in window in case it's exposed there
  const possibleFrontendKeys = Object.keys(window).filter(key => 
    key.includes('frontend') || key.includes('hass') || key.includes('lovelace')
  );
  
  for (const key of possibleFrontendKeys) {
    const obj = (window as any)[key];
    if (obj && typeof obj.import === 'function') {
      try {
        return await loadLitFromFrontend(obj);
      } catch (e) {
        console.debug(`Tried loading from ${key} but failed:`, e);
        // Continue trying other options
      }
    }
  }

  throw new Error('Could not access Home Assistant frontend');
}

// Helper function to load Lit modules from a frontend object
async function loadLitFromFrontend(frontend: any): Promise<LitModules> {
  try {
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
  } catch (e) {
    console.error("Error loading Lit from frontend:", e);
    throw e;
  }
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