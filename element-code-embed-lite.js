!(function () {
    const url = new URL(document.currentScript?.src || "");
    const componentName = url.searchParams.get("name") || "code-embed";
    // ************************************************************************
    // best helper function ever
    const createElement = (tag, props = {}) => Object.assign(document.createElement(tag), props);

    // ******************************************************************** component settings
    const _FONTNAME_ = `FontWithASyntaxHighlighter-Regular`;
    const _FONTFILE_ = `https://code-embed.github.io/font/${_FONTNAME_}.woff2`;

    // ******************************************************************** define component
    customElements.define(componentName, class extends HTMLElement {
        // ==================================================================== createStyle
        createStyle() {
            const getColorProperty = name => getComputedStyle(this).getPropertyValue('--code-embed-color_' + name);
            // ----------------------------------------------------------------
            this.colors = (this.colors || document.head.querySelector("style#" + this.colors_id));
            if (!this.colors) {
                this.colors_id = "codeEmbedcolors_" + crypto.randomUUID().replaceAll("-", "");
                this.colors = document.head.appendChild(
                    createElement("style", {
                        title: "injected",
                        id: this.colors_id,
                        set: ({
                            // ------------------------------------------------
                            color_tag = getColorProperty("tag") || "#ec8065",
                            color_comment = getColorProperty("comment") || "#b6c2a3",
                            color_keyword = getColorProperty("keyword") || "#C792EA",
                            color_function = getColorProperty("function") || "#82AAFF",
                            color_string = getColorProperty("string") || "#37c92c",
                            color_number = getColorProperty("number") || "#1ac6ff",
                            color_variable = getColorProperty("variable") || "#FFFFFF",
                            color_constant = getColorProperty("constant") || "#FFCB6B",
                            color_special = getColorProperty("comment") || "#ff79c6",
                            // ------------------------------------------------
                            color_background = this.getAttribute("color_background") || "var(--code-embed-color_background,black)",
                            color_text = this.getAttribute("color_text") || "var(--code-embed-color_text,#6A9955)",
                            // ------------------------------------------------
                            newfont = new FontFace(_FONTNAME_, `url('${_FONTFILE_}')`),
                            palette = `--SyntaxHighlighter`
                        }) => {
                            // ------------------------------------------------ set <head><style> for textarea
                            this.palettestyle.textContent =
                                `textarea{font-palette:${palette};font:1em '${_FONTNAME_}'}` +
                                `textarea{background:${color_background};color:${color_text}}`;
                            // ------------------------------------------------ set CSS override colors
                            this.colors.textContent = `@font-face{font-weight:normal;font-style:normal;font-display:swap}` +
                                `@font-palette-values ${palette}{font-family:'${_FONTNAME_}';override-colors:` +
                                // override-colors requires actual color values (hex, rgb, etc.) at parse time, not CSS custom properties.
                                ` 0 ${color_tag}, 1 ${color_comment}, 2 ${color_keyword}, 3 ${color_function},` +
                                ` 4 ${color_string}, 5 ${color_number}, 6 ${color_variable}, 7 ${color_constant}, 8 ${color_special}` +
                                `}`;
                            // ------------------------------------------------ font administration
                            if (!window["__" + _FONTNAME_]) {
                                window["__" + _FONTNAME_] = true;
                                newfont.load().then(() => {
                                    document.fonts.add(newfont);
                                }).catch(e => {
                                    console.error("Font failed to load:", _FONTFILE_, e);
                                });
                            }
                        } // end set({})
                    })); // end createElement("style")
                this.colors.set({});
            } // end if (!this.colors){}
        }
        // ==================================================================== constructor
        constructor() {
            super().attachShadow({ mode: "open" })
                .append(
                    // this.colors inject STYLE in <head>
                    this.palettestyle = createElement("style"),
                )
            // div/textarea appended in connectedCallback
        }
        // ==================================================================== connectedCallback
        connectedCallback() {
            this.connect_once();
        }
        connect_once() {
            this.connect_once = () => { }
            this.createStyle();
            this.shadowRoot.append(
                createElement("style", {
                    textContent:
                        `textarea{display:block;white-space:pre;width:100%;line-height:1.2em}`
                }),
                this.textarea = createElement("textarea", {
                    rows: this.getAttribute("rows") || 40,
                    readOnly: this.hasAttribute("readonly"),
                    part: "textarea",
                })
            );
            this.textarea.setAttribute("autocapitalize", this.getAttribute("autocapitalize") || "off");
            this.textarea.setAttribute("autocomplete", this.getAttribute("autocomplete") || "off");
            this.textarea.setAttribute("autocorrect", this.getAttribute("autocorrect") || "off");
            this.textarea.setAttribute("spellcheck", this.getAttribute("spellcheck") || "false");
            this.fetch();
        }
        // ==================================================================== fitrows
        fitrows() {
            let linecount = this.textarea.value.split("\n").length;
            this.textarea.setAttribute("rows", linecount);
        }
        // ==================================================================== fetch
        async wait4font() {
            const FUNC_afterFontLoaded = () => {
                this.dispatchEvent(new CustomEvent(this.localName, {
                    composed: true, bubbles: true,
                    detail: {
                        src: this.src
                    }
                }));
            }
            if (document.fonts && document.fonts.check(`1em '${_FONTNAME_}'`)) {
                FUNC_afterFontLoaded();
            } else if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
                FUNC_afterFontLoaded();
            } else {
                FUNC_afterFontLoaded();
            }
        }
        async fetch(src = this.getAttribute("src")) {
            this.src = src;
            if (src) {
                const result = await fetch(src);
                this.value = await result.text();
            } else {
                setTimeout(() => {
                    // for="id" loads outerHTML, in="id" loads innerHTML
                    let forAttr = this.getAttribute("for");
                    let inAttr = this.getAttribute("in");
                    let elem = forAttr ? document.getElementById(forAttr) : inAttr ? document.getElementById(inAttr) : null;
                    this.value = elem ? (forAttr ? elem.outerHTML : elem.innerHTML) : this.innerHTML;
                    if (this.getAttribute("rows") === "fit") this.fitrows();
                });
            }
        }
        set value(val) {
            let lines = val.split("\n").map(line => line.replace(/\r$/, ""));
            // ------------------------------------------------------------ remove common leading spaces
            let minLeadingSpaces = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length));
            lines = lines.map(line => line.substring(minLeadingSpaces));
            // ------------------------------------------------------------ remove trailing empty lines
            while (lines.length && !lines[0].trim()) lines.shift(); // trim leading empty lines
            while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); // trim trailing empty lines
            // ------------------------------------------------------------ join lines
            lines = lines.join("\n");
            // ------------------------------------------------------------ adjust tabsize
            let tabsize = this.getAttribute("tabsize")||4;
            if (tabsize != 4) {
                lines = lines.replaceAll("    ", " ".repeat(tabsize));
            }
            // ------------------------------------------------------------ set textarea value
            this.textarea.value = lines;
            this.wait4font();
        }
        get value() {
            return this.textarea.value;
        }
    });
    // ********************************************************************
})();
