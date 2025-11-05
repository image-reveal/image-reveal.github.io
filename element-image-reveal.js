!(function () { // wrapped in IIFE for easier/safer inclusion
    const url = new URL(document.currentScript?.src || '');
    const componentName = url.searchParams.get('name') || 'image-reveal';

    // ************************************************************************ define component
    customElements.define(componentName, class extends HTMLElement {
        // ==================================================================== connectedCallback
        connectedCallback() { // exec all in connectedCallback so we can access attributes, one scope only
            setTimeout(() => { // wait till innerHTML is parsed
                let HOTSPOTS, CIRCLE, DIV, CLEARIMG, SVG, HOTSLOT; // scoped references for writing less "this.X" notation
                // ------------------------------------------------------------ SETTINGS
                const minimal_radius = Number(this.getAttribute('minradius') || 100);
                const maximum_radius = Number(this.getAttribute('maxradius') || 200);
                const src = this.getAttribute('src') || '';
                const blurred = `filter:blur(${this.getAttribute('blur') || 5}px)`;
                // ------------------------------------------------------------ HELPER FUNCTIONS CREATE DOM
                // best helper function ever
                const createElement = (tag, props = {}) => Object.assign(document.createElement(tag), props);
                const createIMG = (id, props = {}) => this[id] = createElement('img', { id, src, ...props });
                // ------------------------------------------------------------ STATE
                let animating = false;
                let mouseX = 0, mouseY = 0;
                let currentRadius = minimal_radius;
                let targetRadius = minimal_radius;
                // ------------------------------------------------------------ Create/Update SVG border circle
                const clipCircle = (r = 0, x = 0, y = 0) => {
                    // -------------------------------------------------------- find nearby hotspots
                    const spotted = HOTSPOTS
                        .map(({ node, x, y }) => ({ node, distance: Math.hypot(mouseX - x, mouseY - y) }))
                        .sort((a, b) => a.distance - b.distance)
                        .filter(hotspot => hotspot.distance < 60); // distance from x,y
                    // -------------------------------------------------------- style CSS! circle
                    CLEARIMG.style.clipPath = `circle(${r}px at ${x}px ${y}px)`; // apply CSS clipPath
                    // -------------------------------------------------------- position SVG circle
                    CIRCLE.setAttribute('cx', x);
                    CIRCLE.setAttribute('cy', y);
                    CIRCLE.setAttribute('r', r);
                    // console.log('clipCircle:', r, x, y, spotted);
                    // shadowDOM is configured for Manual SLOT assigment
                    // assigns ONE <hotspot> to <slot> or empty array for no nodes. A JS "unassign" method would be nice here.
                    HOTSLOT.assign(...(spotted.length ? [spotted[0].node] : []));
                };
                // ------------------------------------------------------------ CIRCLE ANIMATION FUNCTIONS
                const animateRadius = (r) => (targetRadius = r, animating || (animating = true, animateCircle()));
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
                                `#blur{${blurred}}`
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
                    node: hotspot, x: hotspot.getAttribute('x'), y: hotspot.getAttribute('y')
                }));
                // ------------------------------------------------------------ ON RESIZE
                window.addEventListener('resize', () => DIV.setheight());
                // ------------------------------------------------------------ MORE DOM ELEMENTS
                DIV.append(
                    // -------------------------------------------------------- stacked images
                    createIMG('blur'),
                    CLEARIMG = createIMG('clear', {
                        onload: () => {
                            DIV.setheight() // adjust DIV height when image is loaded
                            clipCircle(100, 255, 120); // set initial blurred state
                        }
                    }),
                    // -------------------------------------------------------- circle SVG border
                    SVG = Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), {
                        innerHTML: `<circle fill='none' stroke='white' stroke-width='5'/>`
                    }), // SVG with proper NameSpace
                    // -------------------------------------------------------- displays text label for nearest hotspot
                    HOTSLOT = createElement('slot', { innerHTML: HOTSPOTS.length ? `Find the ${HOTSPOTS.length} hotspots` : `` })
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