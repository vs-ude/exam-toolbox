import { CommonModule, DOCUMENT } from "@angular/common";
import { Component, ElementRef, Inject, Input, Renderer2 } from "@angular/core";
import { Task } from "../../../../exam";
import { environment } from "../../../../../environments/environment";

@Component({
  selector: "app-pool-task",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./pool-task.component.html",
  styleUrl: "./pool-task.component.scss",
})
export class PoolTaskComponent {
  @Input()
  public task!: Task;
  @Input()
  public color!: string;
  @Input()
  public iconName!: string;
  public readonly publicPath = environment.publicPath;

  public hovered = false;
  public tooltipVisible = false;
  private tooltipTimeout?: number;
  private readonly tooltipDelay = 800;

  private tooltipEl?: HTMLElement;

  constructor(
    private host: ElementRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  private createTooltipElement(): HTMLElement {
    const el = this.renderer.createElement("div") as HTMLElement;
    // reuse existing CSS class for styling
    this.renderer.addClass(el, "task_tooltip");
    // ensure it's fixed and above other elements
    this.renderer.setStyle(el, "position", "fixed");
    this.renderer.setStyle(el, "z-index", "2147483647");
    this.renderer.setStyle(el, "left", "0px");
    this.renderer.setStyle(el, "top", "0px");
    this.renderer.setStyle(el, "max-width", "none");
    return el;
  }

  private renderTooltipContent(el: HTMLElement) {
    // question
    const q = this.renderer.createElement("div");
    this.renderer.addClass(q, "tooltip_question");
    this.renderer.setProperty(q, "textContent", this.task.question.DE);
    this.renderer.appendChild(el, q);

    // tags
    if (this.task.tags && this.task.tags.length) {
      const tagContainer = this.renderer.createElement("div");
      this.renderer.addClass(tagContainer, "tooltip_tags");
      for (const tag of this.task.tags) {
        const t = this.renderer.createElement("span");
        this.renderer.addClass(t, "tooltip_tag");
        this.renderer.setProperty(t, "textContent", tag.name);
        this.renderer.setStyle(t, "background", tag.color);
        this.renderer.setStyle(t, "color", tag.textColor);
        this.renderer.appendChild(tagContainer, t);
      }
      this.renderer.appendChild(el, tagContainer);
    }
  }

  public onMouseEnter(): void {
    this.hovered = true;
    this.tooltipTimeout = window.setTimeout(() => {
      this.tooltipEl = this.createTooltipElement();
      this.renderTooltipContent(this.tooltipEl);
      this.renderer.appendChild(this.document.body, this.tooltipEl);

      const rect = (this.host.nativeElement as HTMLElement)
        .getBoundingClientRect();
      const margin = 12;
      // desired width = host width, but clamp to viewport
      let width = Math.min(
        rect.width,
        Math.max(100, window.innerWidth - margin * 2),
      );
      let left = rect.left;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width);
      }
      left = Math.max(margin, left);

      // position vertically below, flip above if not enough space
      let top = rect.bottom + 8;
      const approxHeight = Math.min(240, window.innerHeight - margin * 2);
      if (top + approxHeight > window.innerHeight) {
        top = Math.max(margin, rect.top - 8 - approxHeight);
      }

      this.renderer.setStyle(this.tooltipEl, "left", `${Math.round(left)}px`);
      this.renderer.setStyle(this.tooltipEl, "top", `${Math.round(top)}px`);
      this.renderer.setStyle(this.tooltipEl, "width", `${Math.round(width)}px`);

      // trigger fade/slide-in animation by adding a visible class shortly after insert
      setTimeout(() => {
        if (this.tooltipEl) {
          this.renderer.addClass(this.tooltipEl, "tooltip-visible");
        }
      }, 10);

      this.tooltipVisible = true;
    }, this.tooltipDelay);
  }

  public onMouseLeave(): void {
    this.hovered = false;
    this.tooltipVisible = false;
    if (this.tooltipTimeout !== undefined) {
      window.clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = undefined;
    }
    if (this.tooltipEl) {
      // remove visible class to animate out, then remove element after animation
      this.renderer.removeClass(this.tooltipEl, "tooltip-visible");
      setTimeout(() => {
        try {
          this.renderer.removeChild(this.document.body, this.tooltipEl!);
        } catch (e) {}
        this.tooltipEl = undefined;
      }, 200);
    }
  }
}
