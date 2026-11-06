import Handlebars from 'handlebars';

export type DelegateHandler = (event: Event, target: HTMLElement) => void;

export class BaseComponent {
    private _compiledTemplate: HandlebarsTemplateDelegate;
    private readonly _props: Record<string, any>;
    private _element: HTMLElement | null;
    private _container: HTMLElement | null;
    private _listeners: { element: HTMLElement; event: string; handler: EventListener }[];
    private _children: BaseComponent[];

    constructor(template: string, props: Record<string, any> = {}) {
        this._compiledTemplate = Handlebars.compile(template);
        this._props = { ...props };
        this._element = null;
        this._container = null;
        this._listeners = [];
        this._children = [];
    }

    render(container: HTMLElement): void {
        this._container = container;
        this._element = this._createElement();
        this._container.appendChild(this._element);
        this._afterRender();
        this._addEventListeners();
    }

    update(newProps: Record<string, any>): void {
        Object.assign(this._props, newProps);

        if (!this._element || !this._container) return;

        this._cleanup();

        const newElement = this._createElement();
        this._container.replaceChild(newElement, this._element);
        this._element = newElement;

        this._afterRender();
        this._addEventListeners();
    }

    destroy(): void {
        this._cleanup();
        this._element?.remove();
        this._element = null;
        this._container = null;
    }

    getElement(): HTMLElement | null {
        return this._element;
    }

    _addEventListeners(): void {}

    _afterRender(): void {}

    _on(element: HTMLElement, event: string, handler: EventListener): void {
        if (!element) {
            console.warn('_on: element is null, event:', event);
            return;
        }
        const bound: EventListener = handler.bind(this);
        element.addEventListener(event, bound);
        this._listeners.push({ element, event, handler: bound });
    }

    _delegate(event: string, selector: string, handler: DelegateHandler): void {
        if (!this._element) return;

        const wrapper: EventListener = (e) => {
            const target = (e.target as HTMLElement).closest(selector) as HTMLElement;
            if (target && this._element!.contains(target)) {
                handler.call(this, e, target);
            }
        };

        this._on(this._element, event, wrapper);
    }

    _renderChild(child: BaseComponent, selector: string) {
        const container: HTMLElement | null | undefined = this._element?.querySelector<HTMLElement>(selector);
        if (!container) {
            console.warn(`_renderChild: selector "${selector}" не найден`);
            return;
        }
        child.render(container);
        this._children.push(child);
    }

    _createElement(): HTMLElement {
        const html: string = this._compiledTemplate(this._props).trim();
        const temp: HTMLDivElement = document.createElement('div');
        temp.innerHTML = html;

        if (temp.children.length !== 1) {
            console.warn(
                'BaseComponent: шаблон должен иметь ровно один корневой элемент.',
                'Получено:',
                temp.children.length,
            );
        }

        return temp.firstElementChild as HTMLElement;
    }

    _cleanup(): void {
        this._listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._listeners = [];

        this._children.forEach((child: BaseComponent) => child.destroy());
        this._children = [];
    }
}
