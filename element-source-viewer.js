(function () {
    const url = new URL(document.currentScript?.src || "");
    const componentName = url.searchParams.get("name") || "source-viewer";
    // ********************************************************************
    // best helper function ever
    const createElement = (tag, props = {}) => Object.assign(document.createElement(tag), props);

    // ******************************************************************** component settings
    const CODEEMBED = "code-embed";

    // ******************************************************************** define component
    customElements.define(componentName, class extends HTMLElement {
        // ==================================================================== connectedCallback
        connectedCallback() {
            setTimeout(() => { // make sure lightDOM is loaded
                // ------------------------------------------------------------ get attributes
                const src = this.getAttribute("src");
                const rows = this.getAttribute("rows") || "fit";
                // ------------------------------------------------------------ set shadowDOM
                this.attachShadow({ mode: "open" })
                    .append(
                        createElement("style", {
                            textContent:
                                `h3{margin-bottom:0.5em}` +
                                `details{padding:1em}` +
                                `summary{cursor:pointer}` +
                                `b{color:blue}` +
                                `${CODEEMBED}{margin-left:2em}`
                        }),
                        createElement("hr"),
                        createElement("h3", { innerHTML: src }),
                        createElement("div", { innerHTML: this.innerHTML }),
                        createElement("details", {
                            open: this.hasAttribute("open"),
                            innerHTML:
                                `<summary><b>see: ${src}</b></summary>` +
                                `<${CODEEMBED} src="${src}" tabsize=2 exportparts="textarea:source"></${CODEEMBED}>`
                        })
                    );
                // ------------------------------------------------------------ fix rows
                document.addEventListener(`${CODEEMBED}`, (evt) => {
                    if (src === evt.detail.src) {
                        //this.shadowRoot.querySelector(CODEEMBED).fitrows();
                        evt.composedPath()[0].fitrows()
                    }
                });
            })
        }
    })
})();