
import Field from '../Field'
import NumberFieldView from '../View/Field/Number'

/**
 * Number field
 */
export default class NumberField extends Field {
  /**
   * Constructor
   * @param {string} name Field name
   * @param {object} spec Field spec
   * @param {mixed} [spec.options] Field options
   * @param {boolean} [spec.options.integer=false] Wether to use integer values
   * @param {?number} [spec.options.step=1] Step size
   * @param {?number} [spec.options.min=null] Minimum value (inclusive)
   * @param {?number} [spec.options.max=null] Maximum value (exclusive)
   * @param {?boolean} [spec.options.rotate=true] Wether the value should rotate
   * when stepping over limits. Rotation can only be enabled when both min and
   * max values are defined.
   * @param {function(value: number, field: Field): ?string}
   * [spec.options.describeValue] Function describing the given numeric value in
   * a context-based human-readable way. It only gets called with valid values.
   */
  constructor (name, spec) {
    super(name, spec)
    this._viewPrototype = NumberFieldView

    const options = spec.options || {}
    this._integer = options.integer || false
    this._step = options.step || 1
    this._min = options.min || null
    this._max = options.max || null
    this._rotate =
      (options.rotate || true) && this._min !== null && this._max !== null

    // Describe value function
    this._describeValueCallback = options.describeValue || null
  }

  /**
   * Returns wether to use integer values.
   * @return {boolean}
   */
  isInteger () {
    return this._integer
  }

  /**
   * Sets wether to use integer values.
   * @param {boolean} integer
   * @return {NumberField} Fluent interface
   */
  setInteger (integer) {
    this._integer = integer
    return this.revalidateValue()
  }

  /**
   * Returns how much to add or remove when stepping value up or down.
   * @return {?number}
   */
  getStep () {
    return this._step
  }

  /**
   * Sets step size.
   * @param {?number} step Step size
   * @return {NumberField} Fluent interface
   */
  setStep (step) {
    this._step = step
    return this
  }

  /**
   * Step up or down value and repeat the process until finding a valid one.
   * @param {number} step Relative step size
   * @param {number} [maxTries=100] Number of max tries to find a valid value
   * @return {?number} Resulting value or null if unable to find
   */
  stepValue (step, maxTries = 100) {
    let value = this.getValue()
    let tries = 0
    let valueFound = false

    while (
      // Step value until a valid one is found or until max tries is reached
      !valueFound &&
      tries++ < maxTries &&
      // Stop when reaching limits with rotation disabled
      // eslint-disable-next-line no-unmodified-loop-condition
      (this._rotate || step > 0 || value !== this._min) &&
      // eslint-disable-next-line no-unmodified-loop-condition
      (this._rotate || step < 0 || value !== this._max)
    ) {
      // Add step to value
      value += step

      // Rotate to min or max value when reaching limits
      if (this._rotate && value > this._max && this._rotate) {
        value = this._min
      } else if (this._rotate && value < this._min && this._rotate) {
        // Step is added during rotation due to max being defined exclusive
        value = this._max + step
      }

      // Validate value
      valueFound = this.validateValue(value) === true
    }

    return valueFound ? value : null
  }

  /**
   * Step up value.
   * @return {NumberField} Fluent interface
   */
  stepUp () {
    const value = this.stepValue(this._step)
    return value !== null ? this.setValue(value) : this
  }

  /**
   * Step down value.
   * @return {NumberField} Fluent interface
   */
  stepDown () {
    const value = this.stepValue(-this._step)
    return value !== null ? this.setValue(value) : this
  }

  /**
   * Returns minimum value (inclusive).
   * @return {?number} Minimum value
   */
  getMin () {
    return this._min
  }

  /**
   * Sets minimum value (inclusive).
   * @param {?number} min Minimum value
   * @return {NumberField} Fluent interface
   */
  setMin (min) {
    this._min = min
    return this.revalidateValue()
  }

  /**
   * Returns maximum value (exclusive).
   * @return {?number} Maximum value
   */
  getMax () {
    return this._max
  }

  /**
   * Sets maximum value (exclusive).
   * @param {?number} max Maximum value
   * @return {NumberField} Fluent interface
   */
  setMax (max) {
    this._max = max
    return this.revalidateValue()
  }

  /**
   * Returns wether the value should rotate when stepping over limits.
   * @return {boolean}
   */
  isRotate () {
    return this._rotate
  }

  /**
   * Sets wether the value should rotate when stepping over limits. Rotation can
   * only be enabled when both min and max values are defined.
   * @param {boolean} rotate Wether rotation is enabled
   * @return {NumberField} Fluent interface
   */
  setRotate (rotate) {
    this._rotate = rotate && this._min !== null && this._max !== null
    return this
  }

  /**
   * Returns a string describing the current numeric field value in a
   * context-based human-readable way. If no description is available, `null`
   * is returned.
   * @return {?string} Value description, if any
   */
  getValueDescription () {
    if (!this.isValid() || this._describeValueCallback === null) {
      return null
    }
    return this._describeValueCallback(this.getValue(), this)
  }

  /**
   * Requests an update to the value description in the current view that is not
   * related to a value change (e.g. when the description is depending on other
   * field value).
   * @return {NumberField} Fluent interface
   */
  setNeedsValueDescriptionUpdate () {
    this.hasView() && this.getView().updateValue()
  }

  /**
   * Validates given raw value.
   * @param {mixed} rawValue Value to be validated
   * @return {boolean|object} True if valid, message object or false if invalid
   */
  validateValue (rawValue) {
    const value = this.filterValue(rawValue)

    // is numeric
    if (isNaN(value) || !isFinite(value)) {
      return {
        key: 'numberNotNumeric',
        message: `The value is not numeric`
      }
    }

    // validate min value
    if (this._min !== null && value < this._min) {
      return {
        key: 'numberTooSmall',
        message: `The value must be greater than or equal to ${this._min}`
      }
    }

    // validate max value
    if (this._max !== null && value >= this._max) {
      return {
        key: 'numberTooLarge',
        message: `The value must be less than ${this._max}`
      }
    }

    return super.validateValue(value)
  }

  /**
   * Filters given raw value.
   * @param {mixed} rawValue Value to be filtered
   * @return {mixed} Filtered value
   */
  filterValue (rawValue) {
    if (this.isInteger()) {
      rawValue = parseInt(rawValue)
    } else {
      rawValue = parseFloat(rawValue)
    }
    return super.filterValue(rawValue)
  }

  /**
   * Returns a randomly chosen value or null if not applicable.
   * @param {Random} random Random number generator
   * @return {mixed} Randomly chosen value
   */
  randomizeValue (random) {
    const value = super.randomizeValue(random)
    if (value !== null) {
      return value
    }
    if (this.getMin() !== null && this.getMax() !== null) {
      return this.isInteger()
        ? random.nextInteger(this.getMin(), Math.ceil(this.getMax()) - 1)
        : random.nextFloat(this.getMin(), this.getMax())
    }
    return null
  }

  /**
   * Triggered when value has been changed inside the view.
   * @protected
   * @param {NumberFieldView} view
   * @param {number} value
   */
  viewValueDidChange (view, value) {
    this.setValue(value, view)
  }
}
