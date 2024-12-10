/**!
 * x3-linkedlist
 *
 * MIT License
 *
 * Copyright (c) 2019 Benno Dreißig
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

export class LinkedListItem<T> {
  /**
   * Item behind this item
   * ```
   * A -> ThisItem -> C
   *                  ^
   * ```
   */
  public behind: LinkedListItem<T> | undefined;

  /**
   * Item before this item
   * ```
   * A -> ThisItem -> C
   * ^
   * ```
   */
  public before: LinkedListItem<T> | undefined;

  constructor(
    /**
     * Value of this item
     */
    public value: T,
    /**
     *Function to run on unlink() call. Usually used by LinkedList to fix first and last pointers and reduce length.
     */
    protected unlinkCleanup?: (item: LinkedListItem<T>) => void,
  ) {}

  /**
   * This will link given LinkListItem behind this item.
   * If there's already a LinkedListItem linked behind, it will be relinked accordingly
   */
  public insertBehind(
    /** LinkListItem to be inserted behind this one */
    item: LinkedListItem<T>,
  ): void {
    item.insertBefore(this);

    if (this.behind) {
      let itemChainEnd = item;
      while (itemChainEnd.behind) itemChainEnd = itemChainEnd.behind;

      this.behind.insertBefore(itemChainEnd);
      itemChainEnd.insertBehind(this.behind);
    }
    this.behind = item;
  }

  /**
   * Unlinks this LinkedListItem and calls unlinkCleanup
   * @see LinkedListItem#unlinkCleanup
   */
  public unlink(
    /** If true, additionally removes the reference to the item before and behind */
    unchain = false,
  ): void {
    if (this.before) this.before.behind = this.behind;

    if (this.behind) {
      this.behind.before = this.before;
    }
    if (this.unlinkCleanup) {
      this.unlinkCleanup(this);
    }
    this.unlinkCleanup = undefined;

    if (unchain) {
      this.before = this.behind = undefined;
    }
  }

  /**
   * Item given will be inserted before this item.
   * unlinkCleanup will be copied if neccessary.
   * This function is protected, because LinkedListItem's can only be attached behind.
   * @see insertBehind
   */
  protected insertBefore(
    /** LinkListItem to be inserted before this one */
    before: LinkedListItem<T>,
  ): void {
    this.before = before;
    if (!this.unlinkCleanup) {
      this.unlinkCleanup = before.unlinkCleanup;
    }
  }
}

/**
 * Implements a linked list structure
 * @typeparam T - Type of values within this LinkedList
 */
export class LinkedList<T> {
  /**
   * First item in list
   */
  public first: LinkedListItem<T> | undefined;

  /**
   * Last item in list
   */
  public last: LinkedListItem<T> | undefined;

  /**
   * Current length of this LinkedList.
   * Note that this does not work anymore if you for some reason add your own LinkedListItems to LinkedList by hand
   */
  public length = 0;

  constructor(
    /** Values to be added initially into list */
    values?: Iterable<T> | LinkedList<T>,
  ) {
    if (values) {
      if (values instanceof LinkedList) values = values.values();

      for (const value of values) {
        this.push(value);
      }
    }
  }

  /**
   * Clears this LinkedList.
   * The default complexity is O(1), because it only removes links to the first and last item and resets the length.
   * Note that if any LinkedListItem is still referenced outside the LinkedList, their before and behind fields might
   * still reference the chain, not freeing space.
   *
   * You can set the unchain parameter to true, so every item in the linked list will be unchained,
   * meaning all references to before and behind items will be removed.
   * This increases complexity to O(n), but removes accidental outside references to the full chain.
   */
  public clear(
    /** If `true`, remove link info from every item. Changes complexity to O(n)! */
    unchain = false,
  ): void {
    if (unchain) {
      while (this.first) {
        this.first.unlink(true);
      }
    }

    this.first = this.last = undefined;
    this.length = 0;
  }

  /**
   * As Array#every() given callback is called for every element until one call returns falsy or all elements had been processed
   * @returns `false` if there was a falsy response from the callback, `true` if all elements have been processed "falselesly"
   * @see Array#every
   */
  public every<C>(
    /** Runs for every item in the LinkedList */
    callback: (value: T, item: LinkedListItem<T>, list: this) => boolean,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): boolean {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }

    for (const item of this.keys()) {
      if (!callback(item.value, item, this)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filters values into a new LinkedList
   * @see Array#filter
   */
  public filter<C>(
    /** decides wether given element should be part of new LinkedList */
    callback: (value: T, item: LinkedListItem<T>, list: this) => boolean,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): LinkedList<T> {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }

    const newList: LinkedList<T> = new LinkedList();
    for (const [item, value] of this) {
      if (callback(value, item, this)) {
        newList.push(value);
      }
    }
    return newList;
  }

  /**
   * Returns value for which given callback returns truthy
   * @see Array#find
   */
  public find<C>(
    /** runs for every value in LinkedList. If it returns truthy, current value is returned. */
    callback: (value: T, item: LinkedListItem<T>, list: this) => boolean,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): T | undefined {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }

    for (const [item, value] of this) {
      if (callback(value, item, this)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Returns the LinkedListItem for which given callback returns truthy
   * @see Array#findIndex
   */
  public findItem<C>(
    /** runs for every LinkedListItem in LinkedList. If it returns truthy, current LinkedListItem is returned. */
    callback: (value: T, item: LinkedListItem<T>, list: this) => boolean,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): LinkedListItem<T> | undefined {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }

    for (const [item, value] of this) {
      if (callback(value, item, this)) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * Iterates this LinkedList's items and values
   * @see Array#forEach
   */
  public forEach<C>(
    /** Gets every value in LinkedList once with corresponding LinkedListItem and LinkedList */
    callback: (value: T, item: LinkedListItem<T>, list: this) => void,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): void {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }
    for (const [item, value] of this) {
      callback(value, item, this);
    }
  }

  /**
   * Checks if value can be found within LinkedList, starting from fromIndex, if given.
   * @returns true if value could be found in LinkedList (respecting fromIndex), false otherwhise
   * @see Array#includes
   */
  public includes(
    /** value to be found in this */
    value: T,
    /** Starting index. Supports negative values for which `this.size - 1 + fromIndex` will be used as starting point. */
    fromIndex = 0,
  ): boolean {
    let current = this.getItemByIndex(fromIndex);
    while (current) {
      if (current.value === value) {
        return true;
      }
      current = current.behind;
    }
    return false;
  }

  /**
   * Searches forward for given value and returns the first corresponding LinkedListItem found
   * @see Array#indexOf
   */
  public itemOf(
    /** Value to be found */
    searchedValue: T,
    /** Index to start from */
    fromIndex = 0,
  ): LinkedListItem<T> | undefined {
    let current = this.getItemByIndex(fromIndex);
    while (current) {
      if (current.value === searchedValue) {
        return current;
      }
      current = current.behind;
    }
    return;
  }

  /**
   * Searches backwards for given value and returns the first corresponding LinkedListItem found
   * @see Array#indexOf
   */
  public lastItemOf(
    /** Value to be found */
    searchedValue: T,
    /** Index to start from */
    fromIndex = -1,
  ): LinkedListItem<T> | undefined {
    let current = this.getItemByIndex(fromIndex);
    while (current) {
      if (current.value === searchedValue) {
        return current;
      }
      current = current.before;
    }
    return;
  }

  /**
   * Creates a new LinkedList with each of its itesm representing the output of the callback with each item in current LinkedList.
   * @see Array#map
   */
  public map<V, C>(
    /** Gets value, LinkedListeItem and LinkedList. The response will be used as value in the new LinkedList */
    callback: (value: T, item: LinkedListItem<T>, list: this) => V,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): LinkedList<V> {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }
    const newList = new LinkedList<V>();
    for (const [item, value] of this) {
      newList.push(callback(value, item, this));
    }
    return newList;
  }

  /**
   * From Array#reduce on MDN: The reduce() method executes a reducer function (that you provide) on each element of the LinkedList,
   * resulting in a single output value.
   * @see Array#reduce
   */
  public reduce<V>(
    /**
     * Gets first value, current value (starting with the second value), LinkedListeItem and LinkedList.
     * Note that currentItem will be the second item on first call.
     * The response will be used as the next accumulator.
     */
    callback: (
      accumulator: T,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
  ): V;
  public reduce<V>(
    /**
     * Gets initialValue as accumulator initially, LinkedListeItem and LinkedList.
     * The response will be used as the next accumulator.
     */
    callback: (
      accumulator: V,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
    /** Value for the first call of callback */
    initialValue: V,
  ): V;
  public reduce<V>(
    callback: (
      accumulator: V | T,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
    initialValue?: V | T,
  ): V | T {
    let current = this.first;
    if (!current) {
      if (!initialValue) {
        throw new TypeError(
          "Empty accumulator on empty LinkedList is not allowed.",
        );
      }
      return initialValue;
    }

    if (initialValue === undefined) {
      initialValue = current.value;
      if (!current.behind) {
        return initialValue;
      }
      current = current.behind;
    }

    do {
      initialValue = callback(initialValue, current.value, current, this);
      current = current.behind;
    } while (current);
    return initialValue;
  }

  /**
   * From Array#reduceRight on MDN: The reduceRight() method applies a function against an accumulator and each value of the LinkedList (from last-to-first)
   * to reduce it to a single value.
   * @see Array#reduceRight
   * @see LinkedList#reduce
   */
  public reduceRight<V>(
    /**
     * Gets the last value, current value (starting with the second-to-last value), LinkedListeItem and LinkedList.
     * Note that currentItem will be the second-to-last item on the first call.
     * The response will be used as the next accumulator.
     */
    callback: (
      accumulator: T,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
  ): V;
  public reduceRight<V>(
    /**
     * Gets initialValue as accumulator initially, LinkedListeItem and LinkedList.
     * The response will be used as the next accumulator.
     */
    callback: (
      accumulator: V,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
    /** Value for the first call of callback */
    initialValue: V,
  ): V;
  public reduceRight<V>(
    callback: (
      accumulator: V | T,
      currentValue: T,
      currentItem: LinkedListItem<T>,
      list: this,
    ) => V,
    initialValue?: V | T,
  ): V | T {
    let current = this.last;
    if (!current) {
      if (!initialValue) {
        throw new TypeError(
          "Empty accumulator on empty LinkedList is not allowed.",
        );
      }
      return initialValue;
    }
    if (initialValue === undefined) {
      initialValue = current.value;
      if (!current.before) {
        return initialValue;
      }
      current = current.before;
    }

    do {
      initialValue = callback(initialValue, current.value, current, this);
      current = current.before;
    } while (current);
    return initialValue;
  }

  /**
   * Runs callback for every entry and returns true immediately if call of callback returns truthy.
   * @returns `true` once a callback call returns truthy, `false` if none returned truthy.
   */
  public some<C>(
    /** called for every element. If response is truthy, this currentvalue will be returned by `.some()`. */
    callback: (currentValue: T, item: LinkedListItem<T>, list: this) => boolean,
    /** If given, callback function will be bound to thisArg */
    thisArg?: C,
  ): boolean {
    if (thisArg) {
      callback = callback.bind(thisArg);
    }
    for (const [item, value] of this) {
      if (callback(value, item, this)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Joins values within this by given separator. Uses Array#join directly.
   * @see Array#join
   */
  public join(
    /** separator between items in the resulting string */
    separator?: string,
  ): string {
    return [...this.values()].join(separator);
  }

  /**
   * Concats given values and returns a new LinkedList with all given values.
   * If LinkedList's are given, they will be spread.
   * @see Array#concat
   */
  public concat<V>(
    /** Other values or lists to be concat'ed together */
    ...others: Array<V | LinkedList<V>>
  ): LinkedList<V | T> {
    const newList = new LinkedList<V | T>(this as LinkedList<V | T>);
    for (const other of others) {
      if (other instanceof LinkedList) {
        newList.push(...other.values());
      } else {
        newList.push(other);
      }
    }
    return newList;
  }

  /**
   * Removes the last LinkedListItem and returns its inner value
   */
  public pop(): T | undefined {
    if (!this.last) {
      return;
    }
    const item = this.last;
    item.unlink();
    return item.value;
  }

  /**
   * Adds given values on the end of this LinkedList
   */
  public push(
    /** Values to be added */
    ...values: T[]
  ): number {
    for (const value of values) {
      const item = new LinkedListItem(value, this.unlinkCleanup);
      if (!this.first || !this.last) {
        this.first = this.last = item;
      } else {
        this.last.insertBehind(item);
        this.last = item;
      }
      this.length++;
    }
    return this.length;
  }

  /**
   * Adds given values to the beginning of this LinkedList
   */
  public unshift(
    /** Values to be added */
    ...values: T[]
  ): number {
    for (const value of values) {
      const item = new LinkedListItem(value, this.unlinkCleanup);
      if (!this.last || !this.first) {
        this.first = this.last = item;
      } else {
        item.insertBehind(this.first);
        this.first = item;
      }
      this.length++;
    }
    return this.length;
  }

  /**
   * Removes first occurrence of value found.
   */
  public remove(
    /** value to remove once */
    value: T,
  ): boolean {
    for (const item of this.keys()) {
      if (item.value === value) {
        item.unlink();
        return true;
      }
    }

    return false;
  }

  /**
   * Removes every occurrance of value within this.
   */
  public removeAllOccurrences(
    /** value to remove completely */
    value: T,
  ): boolean {
    let foundSomethingToDelete = false;

    for (const item of this.keys()) {
      if (item.value === value) {
        item.unlink();
        foundSomethingToDelete = true;
      }
    }

    return foundSomethingToDelete;
  }

  /**
   * Returns and removes first element from LinkedList
   */
  public shift(): T | undefined {
    if (!this.first) {
      return;
    }
    const item = this.first;
    item.unlink();
    return item.value;
  }

  /**
   * Returns LinkedListItem and value for every entry of this LinkedList
   */
  public *[Symbol.iterator](): IterableIterator<[LinkedListItem<T>, T]> {
    let current = this.first;
    if (!current) {
      return;
    }
    do {
      yield [current, current.value];
      current = current.behind;
    } while (current);
  }

  /**
   * Returns LinkedListItem and value for every entry of this LinkedList
   * @see LinkedList#Symbol.iterator
   */
  public entries(): IterableIterator<[LinkedListItem<T>, T]> {
    return this[Symbol.iterator]();
  }

  /**
   * Iterates the LinkedListItem's of this LinkedList
   */
  public *keys(): IterableIterator<LinkedListItem<T>> {
    let current = this.first;
    if (!current) {
      return;
    }
    do {
      yield current;
      current = current.behind;
    } while (current);
  }

  /**
   * Returns a value for every entry of this LinkedList
   */
  public *values(): IterableIterator<T> {
    let current = this.first;
    if (!current) {
      return;
    }

    do {
      yield current.value;
      current = current.behind;
    } while (current);
  }

  /**
   * Returns the item by given index.
   * Supports negative values and will return the item at `LinkedList.size - 1 + index` in that case.
   */
  private getItemByIndex(
    /** Index of item to get from list */
    index: number,
  ): LinkedListItem<T> | undefined {
    if (index === undefined) {
      throw new Error("index must be a number!");
    }
    if (!this.first) {
      return;
    }
    let current: LinkedListItem<T> | undefined;
    if (index > 0) {
      current = this.first;
      while (current && index--) {
        current = current.behind;
      }
    } else if (index < 0) {
      current = this.last;
      while (current && ++index) {
        current = current.before;
      }
    } else {
      return this.first;
    }

    return current;
  }

  /**
   * Given to own LinkedListItem's for following jobs regarding an unlink:
   * - If item is first item, set the next item as first item
   * - If item is last item, set the previous item as last item
   * - Decrease length
   */
  private unlinkCleanup = (
    /** Item that has been unlinked */
    item: LinkedListItem<T>,
  ): void => {
    if (this.first === item) {
      this.first = this.first.behind;
    }
    if (this.last === item) {
      this.last = this.last.before;
    }
    this.length--;
  };
}
