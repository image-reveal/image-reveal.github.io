!(function () { // wrapped in IIFE for easier/safer inclusion
    const url = new URL(document.currentScript?.src || '');
    const componentName = url.searchParams.get('name') || 'image-reveal';

    // ************************************************************************ define component
    customElements.define(componentName, class extends HTMLElement {
        // ==================================================================== connectedCallback
        connectedCallback() { // exec all in connectedCallback so we can access attributes, one scope only
            setTimeout(() => { // wait till innerHTML is parsed
                let HOTSPOTS, CIRCLE, DIV, CLEARIMG, SVG, HOTSLOT; // scoped references for writing less "this.X" notation
                // ------------------------------------------------------------ SETTINGS from Attributes
                const imgsrc = this.getAttribute('src') || '';
                const blurredCSS = `filter:blur(${this.getAttribute('blur') || 5}px)`;
                const minimal_radius = this.getAttribute('minradius') || '10%';
                const maximum_radius = this.getAttribute('maxradius') || '10%';
                const stroke = this.getAttribute('stroke') || "white";
                // ------------------------------------------------------------ HELPER FUNCTIONS CREATE DOM
                // best helper function ever:
                const createElement = (tag, props = {}) => Object.assign(document.createElement(tag), props);
                const createIMG = (id, props = {}) => this[id] = createElement('IMG', { id, src: imgsrc, ...props });
                // ------------------------------------------------------------ ALLOW values AND percentages in coordinates
                const parseCoord = (value, dimension) => {
                    if (!value) return 0;
                    const str = String(value).trim();
                    return ~~(str.endsWith('%') ? (parseFloat(str) / 100) * dimension : parseFloat(str));
                };
                // ------------------------------------------------------------ STATE
                let animating = false; // is circle radius animating
                let mouseX = 0, mouseY = 0;
                let currentRadius = parseCoord(minimal_radius, 100); // Parse initial radius
                let targetRadius = parseCoord(minimal_radius, 100);
                // ------------------------------------------------------------ Create/Update SVG border circle
                const clipCircle = (r = 0, x = 0, y = 0) => {
                    // -------------------------------------------------------- calculate actual hotspot positions
                    const { offsetWidth, offsetHeight } = DIV;
                    // -------------------------------------------------------- parse radius (support percentages)
                    const radiusPixels = parseCoord(r, Math.min(offsetWidth, offsetHeight));
                    const radiusPercent = String(r).endsWith('%') ? parseFloat(r) : (radiusPixels / Math.min(offsetWidth, offsetHeight) * 100);
                    // -------------------------------------------------------- find nearby hotspots
                    const spotted = HOTSPOTS
                        .map(({ node, x, y }) => ({ node, x: parseCoord(x, offsetWidth), y: parseCoord(y, offsetHeight) }))
                        .map(({ node, x, y }) => ({ node, distance: Math.hypot(mouseX - x, mouseY - y) }))
                        .sort((a, b) => a.distance - b.distance)
                        .filter(hotspot => hotspot.distance < 60); // distance from x,y
                    // -------------------------------------------------------- calculate percentages
                    const xPercent = offsetWidth ? (x / offsetWidth * 100) : 0;
                    const yPercent = offsetHeight ? (y / offsetHeight * 100) : 0;
                    console.log(radiusPercent)
                    // -------------------------------------------------------- style CSS! circle
                    CLEARIMG.style.clipPath = `circle(${radiusPercent - 2}% at ${xPercent}% ${yPercent}%)`; // apply CSS clipPath with percentages
                    // -------------------------------------------------------- position SVG circle (uses pixels)
                    CIRCLE.setAttribute('cx', x);
                    CIRCLE.setAttribute('cy', y);
                    CIRCLE.setAttribute('r', radiusPixels || 0); // Ensure no NaN
                    // console.log('clipCircle:', r, x, y, spotted);
                    // -------------------------------------------------------- show hotspot label
                    // shadowDOM is configured for Manual SLOT assigment
                    // assigns ONE <hotspot> to <slot> or empty array for no nodes. A DOM "unassign" method would be nice here.
                    HOTSLOT.assign(...(spotted.length ? [spotted[0].node] : []));
                };
                // ------------------------------------------------------------ CIRCLE ANIMATION FUNCTIONS
                // when the user clicks, animate to large radius, on mouseup animate to small radius
                const animateRadius = (r) => {
                    const { offsetWidth, offsetHeight } = DIV;
                    targetRadius = parseCoord(r, Math.min(offsetWidth, offsetHeight));
                    if (!animating) {
                        animating = true;
                        animateCircle();
                    }
                };
                const animateCircle = () => {
                    if (!animating) return;
                    currentRadius += (targetRadius - currentRadius) * 0.2;
                    clipCircle(currentRadius, mouseX, mouseY);
                    if (Math.abs(currentRadius - targetRadius) > 0.5) {
                        requestAnimationFrame(animateCircle);
                    } else {
                        currentRadius = targetRadius;
                        animating = false;
                    }
                }
                // ------------------------------------------------------------ CREATE SHADOWDOM
                this.attachShadow({ mode: 'open', slotAssignment: 'manual' })
                    .append(
                        createElement('STYLE', { // --------------------------- style shadowDOM
                            innerHTML:
                                // :host CSS can be overruled by user
                                `:host{display:block;border:2px solid black;overflow:hidden;cursor:pointer}` +
                                // container DIV
                                `div{position:relative;width:100%;box-sizing:border-box}` +
                                // stack IMGs
                                `img{position:absolute;width:100%;height:100%;object-fit:cover}` +
                                // hotspot title
                                `slot{display:block;font-size:150%;position:absolute;top:10;color:gold;text-shadow:2px 2px 4px black}` +
                                // style clip path SVG
                                `svg{position:absolute;width:100%;height:100%;pointer-events:none}` +
                                // blur first IMG
                                `#blur{${blurredCSS}}`
                        }),
                        DIV = createElement('DIV', { // ---------------------- container DIV
                            part: 'container', // allow user to style container with ::part
                            // ------------------------------------------------ event handlers
                            // (addEventListener is highly overrated)
                            onmousemove: evt => {
                                const { left, top } = DIV.getBoundingClientRect();
                                mouseX = evt.clientX - left; mouseY = evt.clientY - top; // mouseX , mouseY
                                if (!animating) clipCircle(currentRadius, mouseX, mouseY);
                            },
                            onmouseleave: evt => (clipCircle(), animating = false),
                            onmousedown: evt => animateRadius(maximum_radius),
                            onmouseup: evt => animateRadius(minimal_radius),
                            // ------------------------------------------------ DIV container height correction
                            setheight: (aspectRatio = CLEARIMG.naturalHeight / CLEARIMG.naturalWidth) => {
                                DIV.style.height = (DIV.offsetWidth * aspectRatio) + 'px';
                            }
                        }), // end container DIV
                    ); // end append
                // ------------------------------------------------------------ // todo: POINTER EVENTS for touch support
                // DIV.onpointerdown = DIV.onmousedown;
                //------------------------------------------------------------- PROCESS PROXIMITY HOTSPOT
                HOTSPOTS = [...this.querySelectorAll('hotspot')].map(hotspot => ({
                    node: hotspot,
                    x: hotspot.getAttribute('x'),
                    y: hotspot.getAttribute('y')
                }));
                // ------------------------------------------------------------ ON RESIZE
                window.addEventListener('resize', () => CLEARIMG.onload()); // force all recalculations on resize
                // ------------------------------------------------------------ MORE DOM ELEMENTS
                DIV.append(
                    // -------------------------------------------------------- stacked images
                    createIMG('blur'),
                    CLEARIMG = createIMG('clear', {
                        onload: () => { // ------------------------------------ ONLOAD large IMG
                            // set correct height for DIV container, then calculate hotspot positions
                            DIV.setheight();
                            // Parse and set initial radius values
                            const minDimension = Math.min(DIV.offsetWidth, DIV.offsetHeight);
                            clipCircle(
                                targetRadius = currentRadius = parseCoord(minimal_radius, minDimension),
                                parseCoord("40%", DIV.offsetWidth),
                                parseCoord("20%", DIV.offsetHeight)
                            ); // set initial blurred state
                            // -------------------------------------------------------- hotspot markers
                            // show hotspots (with percentages) in now resized IMG
                            if (this.hasAttribute('showspots')) {
                                SVG.querySelector('#hotspot-markers').innerHTML = HOTSPOTS.map(({ x, y }) =>
                                    `<circle part="marker" cx='${parseCoord(x, DIV.offsetWidth)}' cy='${parseCoord(y, DIV.offsetHeight)}'`
                                    + ` r='5' fill='white' stroke='red' stroke-width='2'/>`
                                ).join('');
                            }
                        }
                    }),
                    // -------------------------------------------------------- circle SVG border
                    SVG = Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), {
                        innerHTML: `<circle part="circle" fill='none' stroke='${stroke}' stroke-width='5'/><g id='hotspot-markers'/>`
                    }), // SVG with proper NameSpace
                    // -------------------------------------------------------- displays text label for nearest hotspot
                    // shadowDOM is configured with Manual SLOT assignment!
                    HOTSLOT = createElement('SLOT', {
                        part: 'hotspot-label', // allow user to style with ::part
                        innerHTML: HOTSPOTS.length ? `Find the ${HOTSPOTS.length} hotspots` : ``
                    })
                );
                CIRCLE = SVG.querySelector('circle');
            }); // end setTimeout
        } // end connectedCallback

        // ==================================================================== disconnectedCallback
        // disconnectedCallback() {
        // everything is garbage collected automatically when element is removed from DOM
        // }

    }); // end customElements.define <image-reveal>
})(); // end IIFE