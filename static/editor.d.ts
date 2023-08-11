import React from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type * as ReactDOM from "react-dom/client";
import "@mdxeditor/editor/style.css";
export declare namespace Editor {
    type Methods = MDXEditorMethods;
    type Root = ReactDOM.Root;
    type Ref = React.RefObject<Methods>;
    type Options = {
        id?: string;
        markdown?: string;
        serverSide?: boolean;
    };
}
export declare class Editor {
    #private;
    constructor(options?: Editor.Options);
    get current(): Editor.Methods | null;
    get markdown(): string;
    set markdown(value: string);
    get parent(): HTMLElement;
    get virtual(): boolean;
    append(node: HTMLElement): void;
    render(): this;
    renderToString(): string;
    unmount(): void;
}
