/**
 * Sandcastle - A simple toolbar implementation for CesiumJS examples
 */

class SandcastleImpl {
  constructor() {
    this.toolbar = null;
    this.buttons = [];
    this.toggles = [];
    this.initToolbar();
  }

  initToolbar() {
    // Create toolbar container if it doesn't exist
    let toolbar = document.getElementById("toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.id = "toolbar";
      toolbar.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(42, 42, 42, 0.9);
        padding: 12px;
        border-radius: 4px;
        max-height: calc(100% - 20px);
        overflow-y: auto;
        z-index: 100;
        font-family: sans-serif;
        font-size: 12px;
      `;
      document.body.appendChild(toolbar);
    }
    this.toolbar = toolbar;
  }

  /**
   * Add a default toolbar button that executes immediately
   */
  addDefaultToolbarButton(name, callback) {
    this.addToolbarButton(name, callback);
    // Execute the callback immediately
    setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error(`Error executing default button "${name}":`, error);
      }
    }, 100);
  }

  /**
   * Add a toolbar button
   */
  addToolbarButton(name, callback) {
    const button = document.createElement("button");
    button.textContent = name;
    button.style.cssText = `
      display: block;
      width: 100%;
      margin-bottom: 8px;
      padding: 10px 12px;
      background-color: #2a2a2a;
      color: #fff;
      border: 1px solid #444;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-family: sans-serif;
      transition: background-color 0.2s;
    `;

    button.onmouseover = () => {
      button.style.backgroundColor = "#3a3a3a";
    };
    button.onmouseout = () => {
      button.style.backgroundColor = "#2a2a2a";
    };

    button.onclick = () => {
      try {
        callback();
      } catch (error) {
        console.error(`Error executing button "${name}":`, error);
        alert(`Error: ${error.message}`);
      }
    };

    this.toolbar.appendChild(button);
    this.buttons.push({ name, button, callback });
  }

  /**
   * Add a toggle button
   */
  addToggleButton(name, initialValue, callback) {
    const container = document.createElement("div");
    container.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 8px;
      background-color: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
    `;

    const label = document.createElement("label");
    label.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #fff;
      font-size: 12px;
      margin: 0;
      flex: 1;
    `;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = initialValue;
    checkbox.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
      width: 16px;
      height: 16px;
    `;

    checkbox.onchange = () => {
      try {
        callback(checkbox.checked);
      } catch (error) {
        console.error(`Error executing toggle "${name}":`, error);
      }
    };

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(name));
    container.appendChild(label);
    this.toolbar.appendChild(container);

    this.toggles.push({ name, checkbox, callback });
  }

  /**
   * Reset function - clears all data sources
   */
  reset() {
    console.log("Sandcastle reset called");
  }
}

// Export singleton instance
export default new SandcastleImpl();
