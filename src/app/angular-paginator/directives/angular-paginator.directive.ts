import { Directive, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { AngularPaginatorService } from '../services/angular-paginator.service';
import { AngularPaginatorInstance, Page } from '../others/angular-paginator.interface';
import { Subscription } from 'rxjs/Subscription';

@Directive({
  selector: 'appAngularPaginator, [appAngularPaginator]',
  exportAs: 'angularPaginator'
})

export class AngularPaginatorDirective implements OnInit, OnDestroy {

  @Input() boundaryLinks: boolean;
  @Input() directionLinks: boolean;
  @Input() maxSize: number;
  @Input() rotate: boolean;
  @Input() boundaryLinkNumbers: boolean;
  @Input() forceEllipses: boolean;
  @Input() size: string;
  @Input() id: string;
  @Input() class: string;

  currentPage: number;
  firstPage = 1;
  lastPage: number;
  pages: Page[] = [];

  subscription: Subscription;

  @Output() pageChange: EventEmitter<number> = new EventEmitter<number>();

  constructor(private _angularPaginatorService: AngularPaginatorService, private changeDetectorRef: ChangeDetectorRef) {

    // subscribe to changes
    this.subscription = this._angularPaginatorService.change.subscribe(id => {
      if (id === this.id) {
        this.updatePages();
      }
    });

  }

  // set size for pagination component
  getPaginationSize() {
    if (this.size === 'sm' || this.size === 'lg') {
      return 'pagination-' + this.size;
    }
    return undefined;
  }

  // navigate through pages
  toPreviousPage() {
    if (this.currentPage > this.firstPage) {
      this.setCurrentPage(this.currentPage - 1);
    }
  }

  toNextPage() {
    if (this.currentPage < this.lastPage) {
      this.setCurrentPage(this.currentPage + 1);
    }
  }

  toFirstPage() {
    this.setCurrentPage(this.firstPage);
  }

  toLastPage() {
    this.setCurrentPage(this.lastPage);
  }

  // set current page
  setCurrentPage(page: number) {
    if (this.currentPage !== page) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }

  // create page object used for template
  makePage(number: number, text: any, isActive: boolean) {
    return {
      number: number,
      text: text,
      active: isActive
    };
  }

  // create page array
  getPages(currentPage: number, itemsPerPage: number, totalItems: number) {
    const pages: any = [];

    // Default page limits
    const totalPages: number = this.lastPage = Math.ceil(totalItems / itemsPerPage);

    let startPage = 1;
    let endPage: number = totalPages;
    const isMaxSized: boolean = this.maxSize && this.maxSize < totalPages;

    // recompute if maxSize
    if (isMaxSized) {

      if (this.rotate) {

        // current page is displayed in the middle of the visible ones
        startPage = Math.max(currentPage - Math.floor(this.maxSize / 2), 1);
        endPage = startPage + this.maxSize - 1;

        // Adjust if limit is exceeded
        if (endPage > totalPages) {
          endPage = totalPages;
          startPage = endPage - this.maxSize + 1;
        }
      } else {
        // Visible pages are paginated with maxSize
        startPage = (Math.ceil(currentPage / this.maxSize) - 1) * this.maxSize + 1;

        // adjust last page if limit is exceeded
        endPage = Math.min(startPage + this.maxSize - 1, totalPages);
      }
    }

    // add page number links
    for (let number = startPage; number <= endPage; number++) {
      const page = this.makePage(number, number, number === currentPage);
      pages.push(page);
    }

    // add links to move between page sets
    if (isMaxSized && this.maxSize > 0 && (!this.rotate || this.forceEllipses || this.boundaryLinkNumbers)) {
      if (startPage > 1) {

        if (!this.boundaryLinkNumbers || startPage > 3) { // need ellipsis for all options unless range is too close to beginning
          const previousPageSet = this.makePage(startPage - 1, '...', false);
          pages.unshift(previousPageSet);
        }

        if (this.boundaryLinkNumbers) {

          if (startPage === 3) { // need to replace ellipsis when the buttons would be sequential
            const secondPageLink = this.makePage(2, '2', false);
            pages.unshift(secondPageLink);
          }

          // add the first page
          const firstPageLink = this.makePage(1, '1', false);
          pages.unshift(firstPageLink);
        }
      }

      if (endPage < totalPages) {

        if (!this.boundaryLinkNumbers || endPage < totalPages - 2) { // need ellipsis for all options unless range is too close to end
          const nextPageSet = this.makePage(endPage + 1, '...', false);
          pages.push(nextPageSet);
        }

        if (this.boundaryLinkNumbers) {

          if (endPage === totalPages - 2) { // need to replace ellipsis when the buttons would be sequential
            const secondToLastPageLink = this.makePage(totalPages - 1, totalPages - 1, false);
            pages.push(secondToLastPageLink);
          }

          // add the last page
          const lastPageLink = this.makePage(totalPages, totalPages, false);
          pages.push(lastPageLink);
        }
      }
    }
    return pages;
  }

  // update page array
  updatePages() {
    const instance: AngularPaginatorInstance = this._angularPaginatorService.getInstance(this.id);

    const correctedCurrentPage = this.outOfBoundCorrection(instance);

    if (correctedCurrentPage !== instance['currentPae']) {

      setTimeout(() => {
        this.setCurrentPage(correctedCurrentPage);
        this.pages = this.getPages(instance.currentPage, instance.itemsPerPage, instance.totalItems);

        // detect for changes since OnPush Change detection stragtegy is used
        this.changeDetectorRef.markForCheck();
      });

    } else {
      this.pages = this.getPages(instance.currentPage, instance.itemsPerPage, instance.totalItems);
    }

  }

  // check if currentPage is out of bound with totalPages
  outOfBoundCorrection(instance: AngularPaginatorInstance) {

    const totalPages = Math.ceil(instance['totalItems'] / instance['itemsPerPage']);

    if (totalPages < instance['currentPage'] && 0 < totalPages) {
      return totalPages;
    } else if (instance['currentPage'] < 1) {
      return 1;
    }

    return instance['currentPage'];
  }

  // check if there is any instance registered with the id
  isValidId() {

    if (!this._angularPaginatorService.getInstance(this.id)) {
      throw new Error('There is no instance registered with id `' + this.id + '`');
    }

  }

  ngOnInit() {
    this.isValidId();
    this.updatePages();
  }

  ngOnDestroy() {

    // destroy the subscription when the directive is destroyed
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}