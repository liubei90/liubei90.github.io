var temporal = (function (exports) {
    'use strict';

    var BigInteger = {exports: {}};

    (function (module) {
    var bigInt = (function (undefined$1) {

        var BASE = 1e7,
            LOG_BASE = 7,
            MAX_INT = 9007199254740992,
            MAX_INT_ARR = smallToArray(MAX_INT),
            DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

        var supportsNativeBigInt = typeof BigInt === "function";

        function Integer(v, radix, alphabet, caseSensitive) {
            if (typeof v === "undefined") return Integer[0];
            if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
            return parseValue(v);
        }

        function BigInteger(value, sign) {
            this.value = value;
            this.sign = sign;
            this.isSmall = false;
        }
        BigInteger.prototype = Object.create(Integer.prototype);

        function SmallInteger(value) {
            this.value = value;
            this.sign = value < 0;
            this.isSmall = true;
        }
        SmallInteger.prototype = Object.create(Integer.prototype);

        function NativeBigInt(value) {
            this.value = value;
        }
        NativeBigInt.prototype = Object.create(Integer.prototype);

        function isPrecise(n) {
            return -MAX_INT < n && n < MAX_INT;
        }

        function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
            if (n < 1e7)
                return [n];
            if (n < 1e14)
                return [n % 1e7, Math.floor(n / 1e7)];
            return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
        }

        function arrayToSmall(arr) { // If BASE changes this function may need to change
            trim(arr);
            var length = arr.length;
            if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
                switch (length) {
                    case 0: return 0;
                    case 1: return arr[0];
                    case 2: return arr[0] + arr[1] * BASE;
                    default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
                }
            }
            return arr;
        }

        function trim(v) {
            var i = v.length;
            while (v[--i] === 0);
            v.length = i + 1;
        }

        function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
            var x = new Array(length);
            var i = -1;
            while (++i < length) {
                x[i] = 0;
            }
            return x;
        }

        function truncate(n) {
            if (n > 0) return Math.floor(n);
            return Math.ceil(n);
        }

        function add(a, b) { // assumes a and b are arrays with a.length >= b.length
            var l_a = a.length,
                l_b = b.length,
                r = new Array(l_a),
                carry = 0,
                base = BASE,
                sum, i;
            for (i = 0; i < l_b; i++) {
                sum = a[i] + b[i] + carry;
                carry = sum >= base ? 1 : 0;
                r[i] = sum - carry * base;
            }
            while (i < l_a) {
                sum = a[i] + carry;
                carry = sum === base ? 1 : 0;
                r[i++] = sum - carry * base;
            }
            if (carry > 0) r.push(carry);
            return r;
        }

        function addAny(a, b) {
            if (a.length >= b.length) return add(a, b);
            return add(b, a);
        }

        function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
            var l = a.length,
                r = new Array(l),
                base = BASE,
                sum, i;
            for (i = 0; i < l; i++) {
                sum = a[i] - base + carry;
                carry = Math.floor(sum / base);
                r[i] = sum - carry * base;
                carry += 1;
            }
            while (carry > 0) {
                r[i++] = carry % base;
                carry = Math.floor(carry / base);
            }
            return r;
        }

        BigInteger.prototype.add = function (v) {
            var n = parseValue(v);
            if (this.sign !== n.sign) {
                return this.subtract(n.negate());
            }
            var a = this.value, b = n.value;
            if (n.isSmall) {
                return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
            }
            return new BigInteger(addAny(a, b), this.sign);
        };
        BigInteger.prototype.plus = BigInteger.prototype.add;

        SmallInteger.prototype.add = function (v) {
            var n = parseValue(v);
            var a = this.value;
            if (a < 0 !== n.sign) {
                return this.subtract(n.negate());
            }
            var b = n.value;
            if (n.isSmall) {
                if (isPrecise(a + b)) return new SmallInteger(a + b);
                b = smallToArray(Math.abs(b));
            }
            return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
        };
        SmallInteger.prototype.plus = SmallInteger.prototype.add;

        NativeBigInt.prototype.add = function (v) {
            return new NativeBigInt(this.value + parseValue(v).value);
        };
        NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

        function subtract(a, b) { // assumes a and b are arrays with a >= b
            var a_l = a.length,
                b_l = b.length,
                r = new Array(a_l),
                borrow = 0,
                base = BASE,
                i, difference;
            for (i = 0; i < b_l; i++) {
                difference = a[i] - borrow - b[i];
                if (difference < 0) {
                    difference += base;
                    borrow = 1;
                } else borrow = 0;
                r[i] = difference;
            }
            for (i = b_l; i < a_l; i++) {
                difference = a[i] - borrow;
                if (difference < 0) difference += base;
                else {
                    r[i++] = difference;
                    break;
                }
                r[i] = difference;
            }
            for (; i < a_l; i++) {
                r[i] = a[i];
            }
            trim(r);
            return r;
        }

        function subtractAny(a, b, sign) {
            var value;
            if (compareAbs(a, b) >= 0) {
                value = subtract(a, b);
            } else {
                value = subtract(b, a);
                sign = !sign;
            }
            value = arrayToSmall(value);
            if (typeof value === "number") {
                if (sign) value = -value;
                return new SmallInteger(value);
            }
            return new BigInteger(value, sign);
        }

        function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
            var l = a.length,
                r = new Array(l),
                carry = -b,
                base = BASE,
                i, difference;
            for (i = 0; i < l; i++) {
                difference = a[i] + carry;
                carry = Math.floor(difference / base);
                difference %= base;
                r[i] = difference < 0 ? difference + base : difference;
            }
            r = arrayToSmall(r);
            if (typeof r === "number") {
                if (sign) r = -r;
                return new SmallInteger(r);
            } return new BigInteger(r, sign);
        }

        BigInteger.prototype.subtract = function (v) {
            var n = parseValue(v);
            if (this.sign !== n.sign) {
                return this.add(n.negate());
            }
            var a = this.value, b = n.value;
            if (n.isSmall)
                return subtractSmall(a, Math.abs(b), this.sign);
            return subtractAny(a, b, this.sign);
        };
        BigInteger.prototype.minus = BigInteger.prototype.subtract;

        SmallInteger.prototype.subtract = function (v) {
            var n = parseValue(v);
            var a = this.value;
            if (a < 0 !== n.sign) {
                return this.add(n.negate());
            }
            var b = n.value;
            if (n.isSmall) {
                return new SmallInteger(a - b);
            }
            return subtractSmall(b, Math.abs(a), a >= 0);
        };
        SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

        NativeBigInt.prototype.subtract = function (v) {
            return new NativeBigInt(this.value - parseValue(v).value);
        };
        NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

        BigInteger.prototype.negate = function () {
            return new BigInteger(this.value, !this.sign);
        };
        SmallInteger.prototype.negate = function () {
            var sign = this.sign;
            var small = new SmallInteger(-this.value);
            small.sign = !sign;
            return small;
        };
        NativeBigInt.prototype.negate = function () {
            return new NativeBigInt(-this.value);
        };

        BigInteger.prototype.abs = function () {
            return new BigInteger(this.value, false);
        };
        SmallInteger.prototype.abs = function () {
            return new SmallInteger(Math.abs(this.value));
        };
        NativeBigInt.prototype.abs = function () {
            return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
        };


        function multiplyLong(a, b) {
            var a_l = a.length,
                b_l = b.length,
                l = a_l + b_l,
                r = createArray(l),
                base = BASE,
                product, carry, i, a_i, b_j;
            for (i = 0; i < a_l; ++i) {
                a_i = a[i];
                for (var j = 0; j < b_l; ++j) {
                    b_j = b[j];
                    product = a_i * b_j + r[i + j];
                    carry = Math.floor(product / base);
                    r[i + j] = product - carry * base;
                    r[i + j + 1] += carry;
                }
            }
            trim(r);
            return r;
        }

        function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
            var l = a.length,
                r = new Array(l),
                base = BASE,
                carry = 0,
                product, i;
            for (i = 0; i < l; i++) {
                product = a[i] * b + carry;
                carry = Math.floor(product / base);
                r[i] = product - carry * base;
            }
            while (carry > 0) {
                r[i++] = carry % base;
                carry = Math.floor(carry / base);
            }
            return r;
        }

        function shiftLeft(x, n) {
            var r = [];
            while (n-- > 0) r.push(0);
            return r.concat(x);
        }

        function multiplyKaratsuba(x, y) {
            var n = Math.max(x.length, y.length);

            if (n <= 30) return multiplyLong(x, y);
            n = Math.ceil(n / 2);

            var b = x.slice(n),
                a = x.slice(0, n),
                d = y.slice(n),
                c = y.slice(0, n);

            var ac = multiplyKaratsuba(a, c),
                bd = multiplyKaratsuba(b, d),
                abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

            var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
            trim(product);
            return product;
        }

        // The following function is derived from a surface fit of a graph plotting the performance difference
        // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
        function useKaratsuba(l1, l2) {
            return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
        }

        BigInteger.prototype.multiply = function (v) {
            var n = parseValue(v),
                a = this.value, b = n.value,
                sign = this.sign !== n.sign,
                abs;
            if (n.isSmall) {
                if (b === 0) return Integer[0];
                if (b === 1) return this;
                if (b === -1) return this.negate();
                abs = Math.abs(b);
                if (abs < BASE) {
                    return new BigInteger(multiplySmall(a, abs), sign);
                }
                b = smallToArray(abs);
            }
            if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
                return new BigInteger(multiplyKaratsuba(a, b), sign);
            return new BigInteger(multiplyLong(a, b), sign);
        };

        BigInteger.prototype.times = BigInteger.prototype.multiply;

        function multiplySmallAndArray(a, b, sign) { // a >= 0
            if (a < BASE) {
                return new BigInteger(multiplySmall(b, a), sign);
            }
            return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
        }
        SmallInteger.prototype._multiplyBySmall = function (a) {
            if (isPrecise(a.value * this.value)) {
                return new SmallInteger(a.value * this.value);
            }
            return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
        };
        BigInteger.prototype._multiplyBySmall = function (a) {
            if (a.value === 0) return Integer[0];
            if (a.value === 1) return this;
            if (a.value === -1) return this.negate();
            return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
        };
        SmallInteger.prototype.multiply = function (v) {
            return parseValue(v)._multiplyBySmall(this);
        };
        SmallInteger.prototype.times = SmallInteger.prototype.multiply;

        NativeBigInt.prototype.multiply = function (v) {
            return new NativeBigInt(this.value * parseValue(v).value);
        };
        NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

        function square(a) {
            //console.assert(2 * BASE * BASE < MAX_INT);
            var l = a.length,
                r = createArray(l + l),
                base = BASE,
                product, carry, i, a_i, a_j;
            for (i = 0; i < l; i++) {
                a_i = a[i];
                carry = 0 - a_i * a_i;
                for (var j = i; j < l; j++) {
                    a_j = a[j];
                    product = 2 * (a_i * a_j) + r[i + j] + carry;
                    carry = Math.floor(product / base);
                    r[i + j] = product - carry * base;
                }
                r[i + l] = carry;
            }
            trim(r);
            return r;
        }

        BigInteger.prototype.square = function () {
            return new BigInteger(square(this.value), false);
        };

        SmallInteger.prototype.square = function () {
            var value = this.value * this.value;
            if (isPrecise(value)) return new SmallInteger(value);
            return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
        };

        NativeBigInt.prototype.square = function (v) {
            return new NativeBigInt(this.value * this.value);
        };

        function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
            var a_l = a.length,
                b_l = b.length,
                base = BASE,
                result = createArray(b.length),
                divisorMostSignificantDigit = b[b_l - 1],
                // normalization
                lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
                remainder = multiplySmall(a, lambda),
                divisor = multiplySmall(b, lambda),
                quotientDigit, shift, carry, borrow, i, l, q;
            if (remainder.length <= a_l) remainder.push(0);
            divisor.push(0);
            divisorMostSignificantDigit = divisor[b_l - 1];
            for (shift = a_l - b_l; shift >= 0; shift--) {
                quotientDigit = base - 1;
                if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                    quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
                }
                // quotientDigit <= base - 1
                carry = 0;
                borrow = 0;
                l = divisor.length;
                for (i = 0; i < l; i++) {
                    carry += quotientDigit * divisor[i];
                    q = Math.floor(carry / base);
                    borrow += remainder[shift + i] - (carry - q * base);
                    carry = q;
                    if (borrow < 0) {
                        remainder[shift + i] = borrow + base;
                        borrow = -1;
                    } else {
                        remainder[shift + i] = borrow;
                        borrow = 0;
                    }
                }
                while (borrow !== 0) {
                    quotientDigit -= 1;
                    carry = 0;
                    for (i = 0; i < l; i++) {
                        carry += remainder[shift + i] - base + divisor[i];
                        if (carry < 0) {
                            remainder[shift + i] = carry + base;
                            carry = 0;
                        } else {
                            remainder[shift + i] = carry;
                            carry = 1;
                        }
                    }
                    borrow += carry;
                }
                result[shift] = quotientDigit;
            }
            // denormalization
            remainder = divModSmall(remainder, lambda)[0];
            return [arrayToSmall(result), arrayToSmall(remainder)];
        }

        function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
            // Performs faster than divMod1 on larger input sizes.
            var a_l = a.length,
                b_l = b.length,
                result = [],
                part = [],
                base = BASE,
                guess, xlen, highx, highy, check;
            while (a_l) {
                part.unshift(a[--a_l]);
                trim(part);
                if (compareAbs(part, b) < 0) {
                    result.push(0);
                    continue;
                }
                xlen = part.length;
                highx = part[xlen - 1] * base + part[xlen - 2];
                highy = b[b_l - 1] * base + b[b_l - 2];
                if (xlen > b_l) {
                    highx = (highx + 1) * base;
                }
                guess = Math.ceil(highx / highy);
                do {
                    check = multiplySmall(b, guess);
                    if (compareAbs(check, part) <= 0) break;
                    guess--;
                } while (guess);
                result.push(guess);
                part = subtract(part, check);
            }
            result.reverse();
            return [arrayToSmall(result), arrayToSmall(part)];
        }

        function divModSmall(value, lambda) {
            var length = value.length,
                quotient = createArray(length),
                base = BASE,
                i, q, remainder, divisor;
            remainder = 0;
            for (i = length - 1; i >= 0; --i) {
                divisor = remainder * base + value[i];
                q = truncate(divisor / lambda);
                remainder = divisor - q * lambda;
                quotient[i] = q | 0;
            }
            return [quotient, remainder | 0];
        }

        function divModAny(self, v) {
            var value, n = parseValue(v);
            if (supportsNativeBigInt) {
                return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
            }
            var a = self.value, b = n.value;
            var quotient;
            if (b === 0) throw new Error("Cannot divide by zero");
            if (self.isSmall) {
                if (n.isSmall) {
                    return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
                }
                return [Integer[0], self];
            }
            if (n.isSmall) {
                if (b === 1) return [self, Integer[0]];
                if (b == -1) return [self.negate(), Integer[0]];
                var abs = Math.abs(b);
                if (abs < BASE) {
                    value = divModSmall(a, abs);
                    quotient = arrayToSmall(value[0]);
                    var remainder = value[1];
                    if (self.sign) remainder = -remainder;
                    if (typeof quotient === "number") {
                        if (self.sign !== n.sign) quotient = -quotient;
                        return [new SmallInteger(quotient), new SmallInteger(remainder)];
                    }
                    return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
                }
                b = smallToArray(abs);
            }
            var comparison = compareAbs(a, b);
            if (comparison === -1) return [Integer[0], self];
            if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

            // divMod1 is faster on smaller input sizes
            if (a.length + b.length <= 200)
                value = divMod1(a, b);
            else value = divMod2(a, b);

            quotient = value[0];
            var qSign = self.sign !== n.sign,
                mod = value[1],
                mSign = self.sign;
            if (typeof quotient === "number") {
                if (qSign) quotient = -quotient;
                quotient = new SmallInteger(quotient);
            } else quotient = new BigInteger(quotient, qSign);
            if (typeof mod === "number") {
                if (mSign) mod = -mod;
                mod = new SmallInteger(mod);
            } else mod = new BigInteger(mod, mSign);
            return [quotient, mod];
        }

        BigInteger.prototype.divmod = function (v) {
            var result = divModAny(this, v);
            return {
                quotient: result[0],
                remainder: result[1]
            };
        };
        NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


        BigInteger.prototype.divide = function (v) {
            return divModAny(this, v)[0];
        };
        NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
            return new NativeBigInt(this.value / parseValue(v).value);
        };
        SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

        BigInteger.prototype.mod = function (v) {
            return divModAny(this, v)[1];
        };
        NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
            return new NativeBigInt(this.value % parseValue(v).value);
        };
        SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

        BigInteger.prototype.pow = function (v) {
            var n = parseValue(v),
                a = this.value,
                b = n.value,
                value, x, y;
            if (b === 0) return Integer[1];
            if (a === 0) return Integer[0];
            if (a === 1) return Integer[1];
            if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
            if (n.sign) {
                return Integer[0];
            }
            if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
            if (this.isSmall) {
                if (isPrecise(value = Math.pow(a, b)))
                    return new SmallInteger(truncate(value));
            }
            x = this;
            y = Integer[1];
            while (true) {
                if (b & 1 === 1) {
                    y = y.times(x);
                    --b;
                }
                if (b === 0) break;
                b /= 2;
                x = x.square();
            }
            return y;
        };
        SmallInteger.prototype.pow = BigInteger.prototype.pow;

        NativeBigInt.prototype.pow = function (v) {
            var n = parseValue(v);
            var a = this.value, b = n.value;
            var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
            if (b === _0) return Integer[1];
            if (a === _0) return Integer[0];
            if (a === _1) return Integer[1];
            if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
            if (n.isNegative()) return new NativeBigInt(_0);
            var x = this;
            var y = Integer[1];
            while (true) {
                if ((b & _1) === _1) {
                    y = y.times(x);
                    --b;
                }
                if (b === _0) break;
                b /= _2;
                x = x.square();
            }
            return y;
        };

        BigInteger.prototype.modPow = function (exp, mod) {
            exp = parseValue(exp);
            mod = parseValue(mod);
            if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
            var r = Integer[1],
                base = this.mod(mod);
            if (exp.isNegative()) {
                exp = exp.multiply(Integer[-1]);
                base = base.modInv(mod);
            }
            while (exp.isPositive()) {
                if (base.isZero()) return Integer[0];
                if (exp.isOdd()) r = r.multiply(base).mod(mod);
                exp = exp.divide(2);
                base = base.square().mod(mod);
            }
            return r;
        };
        NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

        function compareAbs(a, b) {
            if (a.length !== b.length) {
                return a.length > b.length ? 1 : -1;
            }
            for (var i = a.length - 1; i >= 0; i--) {
                if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
            }
            return 0;
        }

        BigInteger.prototype.compareAbs = function (v) {
            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (n.isSmall) return 1;
            return compareAbs(a, b);
        };
        SmallInteger.prototype.compareAbs = function (v) {
            var n = parseValue(v),
                a = Math.abs(this.value),
                b = n.value;
            if (n.isSmall) {
                b = Math.abs(b);
                return a === b ? 0 : a > b ? 1 : -1;
            }
            return -1;
        };
        NativeBigInt.prototype.compareAbs = function (v) {
            var a = this.value;
            var b = parseValue(v).value;
            a = a >= 0 ? a : -a;
            b = b >= 0 ? b : -b;
            return a === b ? 0 : a > b ? 1 : -1;
        };

        BigInteger.prototype.compare = function (v) {
            // See discussion about comparison with Infinity:
            // https://github.com/peterolson/BigInteger.js/issues/61
            if (v === Infinity) {
                return -1;
            }
            if (v === -Infinity) {
                return 1;
            }

            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (this.sign !== n.sign) {
                return n.sign ? 1 : -1;
            }
            if (n.isSmall) {
                return this.sign ? -1 : 1;
            }
            return compareAbs(a, b) * (this.sign ? -1 : 1);
        };
        BigInteger.prototype.compareTo = BigInteger.prototype.compare;

        SmallInteger.prototype.compare = function (v) {
            if (v === Infinity) {
                return -1;
            }
            if (v === -Infinity) {
                return 1;
            }

            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (n.isSmall) {
                return a == b ? 0 : a > b ? 1 : -1;
            }
            if (a < 0 !== n.sign) {
                return a < 0 ? -1 : 1;
            }
            return a < 0 ? 1 : -1;
        };
        SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

        NativeBigInt.prototype.compare = function (v) {
            if (v === Infinity) {
                return -1;
            }
            if (v === -Infinity) {
                return 1;
            }
            var a = this.value;
            var b = parseValue(v).value;
            return a === b ? 0 : a > b ? 1 : -1;
        };
        NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

        BigInteger.prototype.equals = function (v) {
            return this.compare(v) === 0;
        };
        NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

        BigInteger.prototype.notEquals = function (v) {
            return this.compare(v) !== 0;
        };
        NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

        BigInteger.prototype.greater = function (v) {
            return this.compare(v) > 0;
        };
        NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

        BigInteger.prototype.lesser = function (v) {
            return this.compare(v) < 0;
        };
        NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

        BigInteger.prototype.greaterOrEquals = function (v) {
            return this.compare(v) >= 0;
        };
        NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

        BigInteger.prototype.lesserOrEquals = function (v) {
            return this.compare(v) <= 0;
        };
        NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

        BigInteger.prototype.isEven = function () {
            return (this.value[0] & 1) === 0;
        };
        SmallInteger.prototype.isEven = function () {
            return (this.value & 1) === 0;
        };
        NativeBigInt.prototype.isEven = function () {
            return (this.value & BigInt(1)) === BigInt(0);
        };

        BigInteger.prototype.isOdd = function () {
            return (this.value[0] & 1) === 1;
        };
        SmallInteger.prototype.isOdd = function () {
            return (this.value & 1) === 1;
        };
        NativeBigInt.prototype.isOdd = function () {
            return (this.value & BigInt(1)) === BigInt(1);
        };

        BigInteger.prototype.isPositive = function () {
            return !this.sign;
        };
        SmallInteger.prototype.isPositive = function () {
            return this.value > 0;
        };
        NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

        BigInteger.prototype.isNegative = function () {
            return this.sign;
        };
        SmallInteger.prototype.isNegative = function () {
            return this.value < 0;
        };
        NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

        BigInteger.prototype.isUnit = function () {
            return false;
        };
        SmallInteger.prototype.isUnit = function () {
            return Math.abs(this.value) === 1;
        };
        NativeBigInt.prototype.isUnit = function () {
            return this.abs().value === BigInt(1);
        };

        BigInteger.prototype.isZero = function () {
            return false;
        };
        SmallInteger.prototype.isZero = function () {
            return this.value === 0;
        };
        NativeBigInt.prototype.isZero = function () {
            return this.value === BigInt(0);
        };

        BigInteger.prototype.isDivisibleBy = function (v) {
            var n = parseValue(v);
            if (n.isZero()) return false;
            if (n.isUnit()) return true;
            if (n.compareAbs(2) === 0) return this.isEven();
            return this.mod(n).isZero();
        };
        NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

        function isBasicPrime(v) {
            var n = v.abs();
            if (n.isUnit()) return false;
            if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
            if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
            if (n.lesser(49)) return true;
            // we don't know if it's prime: let the other functions figure it out
        }

        function millerRabinTest(n, a) {
            var nPrev = n.prev(),
                b = nPrev,
                r = 0,
                d, i, x;
            while (b.isEven()) b = b.divide(2), r++;
            next: for (i = 0; i < a.length; i++) {
                if (n.lesser(a[i])) continue;
                x = bigInt(a[i]).modPow(b, n);
                if (x.isUnit() || x.equals(nPrev)) continue;
                for (d = r - 1; d != 0; d--) {
                    x = x.square().mod(n);
                    if (x.isUnit()) return false;
                    if (x.equals(nPrev)) continue next;
                }
                return false;
            }
            return true;
        }

        // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
        BigInteger.prototype.isPrime = function (strict) {
            var isPrime = isBasicPrime(this);
            if (isPrime !== undefined$1) return isPrime;
            var n = this.abs();
            var bits = n.bitLength();
            if (bits <= 64)
                return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
            var logN = Math.log(2) * bits.toJSNumber();
            var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
            for (var a = [], i = 0; i < t; i++) {
                a.push(bigInt(i + 2));
            }
            return millerRabinTest(n, a);
        };
        NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

        BigInteger.prototype.isProbablePrime = function (iterations, rng) {
            var isPrime = isBasicPrime(this);
            if (isPrime !== undefined$1) return isPrime;
            var n = this.abs();
            var t = iterations === undefined$1 ? 5 : iterations;
            for (var a = [], i = 0; i < t; i++) {
                a.push(bigInt.randBetween(2, n.minus(2), rng));
            }
            return millerRabinTest(n, a);
        };
        NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

        BigInteger.prototype.modInv = function (n) {
            var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
            while (!newR.isZero()) {
                q = r.divide(newR);
                lastT = t;
                lastR = r;
                t = newT;
                r = newR;
                newT = lastT.subtract(q.multiply(newT));
                newR = lastR.subtract(q.multiply(newR));
            }
            if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
            if (t.compare(0) === -1) {
                t = t.add(n);
            }
            if (this.isNegative()) {
                return t.negate();
            }
            return t;
        };

        NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

        BigInteger.prototype.next = function () {
            var value = this.value;
            if (this.sign) {
                return subtractSmall(value, 1, this.sign);
            }
            return new BigInteger(addSmall(value, 1), this.sign);
        };
        SmallInteger.prototype.next = function () {
            var value = this.value;
            if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
            return new BigInteger(MAX_INT_ARR, false);
        };
        NativeBigInt.prototype.next = function () {
            return new NativeBigInt(this.value + BigInt(1));
        };

        BigInteger.prototype.prev = function () {
            var value = this.value;
            if (this.sign) {
                return new BigInteger(addSmall(value, 1), true);
            }
            return subtractSmall(value, 1, this.sign);
        };
        SmallInteger.prototype.prev = function () {
            var value = this.value;
            if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
            return new BigInteger(MAX_INT_ARR, true);
        };
        NativeBigInt.prototype.prev = function () {
            return new NativeBigInt(this.value - BigInt(1));
        };

        var powersOfTwo = [1];
        while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
        var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

        function shift_isSmall(n) {
            return Math.abs(n) <= BASE;
        }

        BigInteger.prototype.shiftLeft = function (v) {
            var n = parseValue(v).toJSNumber();
            if (!shift_isSmall(n)) {
                throw new Error(String(n) + " is too large for shifting.");
            }
            if (n < 0) return this.shiftRight(-n);
            var result = this;
            if (result.isZero()) return result;
            while (n >= powers2Length) {
                result = result.multiply(highestPower2);
                n -= powers2Length - 1;
            }
            return result.multiply(powersOfTwo[n]);
        };
        NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

        BigInteger.prototype.shiftRight = function (v) {
            var remQuo;
            var n = parseValue(v).toJSNumber();
            if (!shift_isSmall(n)) {
                throw new Error(String(n) + " is too large for shifting.");
            }
            if (n < 0) return this.shiftLeft(-n);
            var result = this;
            while (n >= powers2Length) {
                if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
                remQuo = divModAny(result, highestPower2);
                result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
                n -= powers2Length - 1;
            }
            remQuo = divModAny(result, powersOfTwo[n]);
            return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
        };
        NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

        function bitwise(x, y, fn) {
            y = parseValue(y);
            var xSign = x.isNegative(), ySign = y.isNegative();
            var xRem = xSign ? x.not() : x,
                yRem = ySign ? y.not() : y;
            var xDigit = 0, yDigit = 0;
            var xDivMod = null, yDivMod = null;
            var result = [];
            while (!xRem.isZero() || !yRem.isZero()) {
                xDivMod = divModAny(xRem, highestPower2);
                xDigit = xDivMod[1].toJSNumber();
                if (xSign) {
                    xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
                }

                yDivMod = divModAny(yRem, highestPower2);
                yDigit = yDivMod[1].toJSNumber();
                if (ySign) {
                    yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
                }

                xRem = xDivMod[0];
                yRem = yDivMod[0];
                result.push(fn(xDigit, yDigit));
            }
            var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
            for (var i = result.length - 1; i >= 0; i -= 1) {
                sum = sum.multiply(highestPower2).add(bigInt(result[i]));
            }
            return sum;
        }

        BigInteger.prototype.not = function () {
            return this.negate().prev();
        };
        NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

        BigInteger.prototype.and = function (n) {
            return bitwise(this, n, function (a, b) { return a & b; });
        };
        NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

        BigInteger.prototype.or = function (n) {
            return bitwise(this, n, function (a, b) { return a | b; });
        };
        NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

        BigInteger.prototype.xor = function (n) {
            return bitwise(this, n, function (a, b) { return a ^ b; });
        };
        NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

        var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
        function roughLOB(n) { // get lowestOneBit (rough)
            // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
            // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
            var v = n.value,
                x = typeof v === "number" ? v | LOBMASK_I :
                    typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                        v[0] + v[1] * BASE | LOBMASK_BI;
            return x & -x;
        }

        function integerLogarithm(value, base) {
            if (base.compareTo(value) <= 0) {
                var tmp = integerLogarithm(value, base.square(base));
                var p = tmp.p;
                var e = tmp.e;
                var t = p.multiply(base);
                return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
            }
            return { p: bigInt(1), e: 0 };
        }

        BigInteger.prototype.bitLength = function () {
            var n = this;
            if (n.compareTo(bigInt(0)) < 0) {
                n = n.negate().subtract(bigInt(1));
            }
            if (n.compareTo(bigInt(0)) === 0) {
                return bigInt(0);
            }
            return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
        };
        NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

        function max(a, b) {
            a = parseValue(a);
            b = parseValue(b);
            return a.greater(b) ? a : b;
        }
        function min(a, b) {
            a = parseValue(a);
            b = parseValue(b);
            return a.lesser(b) ? a : b;
        }
        function gcd(a, b) {
            a = parseValue(a).abs();
            b = parseValue(b).abs();
            if (a.equals(b)) return a;
            if (a.isZero()) return b;
            if (b.isZero()) return a;
            var c = Integer[1], d, t;
            while (a.isEven() && b.isEven()) {
                d = min(roughLOB(a), roughLOB(b));
                a = a.divide(d);
                b = b.divide(d);
                c = c.multiply(d);
            }
            while (a.isEven()) {
                a = a.divide(roughLOB(a));
            }
            do {
                while (b.isEven()) {
                    b = b.divide(roughLOB(b));
                }
                if (a.greater(b)) {
                    t = b; b = a; a = t;
                }
                b = b.subtract(a);
            } while (!b.isZero());
            return c.isUnit() ? a : a.multiply(c);
        }
        function lcm(a, b) {
            a = parseValue(a).abs();
            b = parseValue(b).abs();
            return a.divide(gcd(a, b)).multiply(b);
        }
        function randBetween(a, b, rng) {
            a = parseValue(a);
            b = parseValue(b);
            var usedRNG = rng || Math.random;
            var low = min(a, b), high = max(a, b);
            var range = high.subtract(low).add(1);
            if (range.isSmall) return low.add(Math.floor(usedRNG() * range));
            var digits = toBase(range, BASE).value;
            var result = [], restricted = true;
            for (var i = 0; i < digits.length; i++) {
                var top = restricted ? digits[i] + (i + 1 < digits.length ? digits[i + 1] / BASE : 0) : BASE;
                var digit = truncate(usedRNG() * top);
                result.push(digit);
                if (digit < digits[i]) restricted = false;
            }
            return low.add(Integer.fromArray(result, BASE, false));
        }

        var parseBase = function (text, base, alphabet, caseSensitive) {
            alphabet = alphabet || DEFAULT_ALPHABET;
            text = String(text);
            if (!caseSensitive) {
                text = text.toLowerCase();
                alphabet = alphabet.toLowerCase();
            }
            var length = text.length;
            var i;
            var absBase = Math.abs(base);
            var alphabetValues = {};
            for (i = 0; i < alphabet.length; i++) {
                alphabetValues[alphabet[i]] = i;
            }
            for (i = 0; i < length; i++) {
                var c = text[i];
                if (c === "-") continue;
                if (c in alphabetValues) {
                    if (alphabetValues[c] >= absBase) {
                        if (c === "1" && absBase === 1) continue;
                        throw new Error(c + " is not a valid digit in base " + base + ".");
                    }
                }
            }
            base = parseValue(base);
            var digits = [];
            var isNegative = text[0] === "-";
            for (i = isNegative ? 1 : 0; i < text.length; i++) {
                var c = text[i];
                if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
                else if (c === "<") {
                    var start = i;
                    do { i++; } while (text[i] !== ">" && i < text.length);
                    digits.push(parseValue(text.slice(start + 1, i)));
                }
                else throw new Error(c + " is not a valid character");
            }
            return parseBaseFromArray(digits, base, isNegative);
        };

        function parseBaseFromArray(digits, base, isNegative) {
            var val = Integer[0], pow = Integer[1], i;
            for (i = digits.length - 1; i >= 0; i--) {
                val = val.add(digits[i].times(pow));
                pow = pow.times(base);
            }
            return isNegative ? val.negate() : val;
        }

        function stringify(digit, alphabet) {
            alphabet = alphabet || DEFAULT_ALPHABET;
            if (digit < alphabet.length) {
                return alphabet[digit];
            }
            return "<" + digit + ">";
        }

        function toBase(n, base) {
            base = bigInt(base);
            if (base.isZero()) {
                if (n.isZero()) return { value: [0], isNegative: false };
                throw new Error("Cannot convert nonzero numbers to base 0.");
            }
            if (base.equals(-1)) {
                if (n.isZero()) return { value: [0], isNegative: false };
                if (n.isNegative())
                    return {
                        value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                            .map(Array.prototype.valueOf, [1, 0])
                        ),
                        isNegative: false
                    };

                var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                    .map(Array.prototype.valueOf, [0, 1]);
                arr.unshift([1]);
                return {
                    value: [].concat.apply([], arr),
                    isNegative: false
                };
            }

            var neg = false;
            if (n.isNegative() && base.isPositive()) {
                neg = true;
                n = n.abs();
            }
            if (base.isUnit()) {
                if (n.isZero()) return { value: [0], isNegative: false };

                return {
                    value: Array.apply(null, Array(n.toJSNumber()))
                        .map(Number.prototype.valueOf, 1),
                    isNegative: neg
                };
            }
            var out = [];
            var left = n, divmod;
            while (left.isNegative() || left.compareAbs(base) >= 0) {
                divmod = left.divmod(base);
                left = divmod.quotient;
                var digit = divmod.remainder;
                if (digit.isNegative()) {
                    digit = base.minus(digit).abs();
                    left = left.next();
                }
                out.push(digit.toJSNumber());
            }
            out.push(left.toJSNumber());
            return { value: out.reverse(), isNegative: neg };
        }

        function toBaseString(n, base, alphabet) {
            var arr = toBase(n, base);
            return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
                return stringify(x, alphabet);
            }).join('');
        }

        BigInteger.prototype.toArray = function (radix) {
            return toBase(this, radix);
        };

        SmallInteger.prototype.toArray = function (radix) {
            return toBase(this, radix);
        };

        NativeBigInt.prototype.toArray = function (radix) {
            return toBase(this, radix);
        };

        BigInteger.prototype.toString = function (radix, alphabet) {
            if (radix === undefined$1) radix = 10;
            if (radix !== 10) return toBaseString(this, radix, alphabet);
            var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
            while (--l >= 0) {
                digit = String(v[l]);
                str += zeros.slice(digit.length) + digit;
            }
            var sign = this.sign ? "-" : "";
            return sign + str;
        };

        SmallInteger.prototype.toString = function (radix, alphabet) {
            if (radix === undefined$1) radix = 10;
            if (radix != 10) return toBaseString(this, radix, alphabet);
            return String(this.value);
        };

        NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

        NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); };

        BigInteger.prototype.valueOf = function () {
            return parseInt(this.toString(), 10);
        };
        BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

        SmallInteger.prototype.valueOf = function () {
            return this.value;
        };
        SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
        NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
            return parseInt(this.toString(), 10);
        };

        function parseStringValue(v) {
            if (isPrecise(+v)) {
                var x = +v;
                if (x === truncate(x))
                    return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
                throw new Error("Invalid integer: " + v);
            }
            var sign = v[0] === "-";
            if (sign) v = v.slice(1);
            var split = v.split(/e/i);
            if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
            if (split.length === 2) {
                var exp = split[1];
                if (exp[0] === "+") exp = exp.slice(1);
                exp = +exp;
                if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
                var text = split[0];
                var decimalPlace = text.indexOf(".");
                if (decimalPlace >= 0) {
                    exp -= text.length - decimalPlace - 1;
                    text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
                }
                if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
                text += (new Array(exp + 1)).join("0");
                v = text;
            }
            var isValid = /^([0-9][0-9]*)$/.test(v);
            if (!isValid) throw new Error("Invalid integer: " + v);
            if (supportsNativeBigInt) {
                return new NativeBigInt(BigInt(sign ? "-" + v : v));
            }
            var r = [], max = v.length, l = LOG_BASE, min = max - l;
            while (max > 0) {
                r.push(+v.slice(min, max));
                min -= l;
                if (min < 0) min = 0;
                max -= l;
            }
            trim(r);
            return new BigInteger(r, sign);
        }

        function parseNumberValue(v) {
            if (supportsNativeBigInt) {
                return new NativeBigInt(BigInt(v));
            }
            if (isPrecise(v)) {
                if (v !== truncate(v)) throw new Error(v + " is not an integer.");
                return new SmallInteger(v);
            }
            return parseStringValue(v.toString());
        }

        function parseValue(v) {
            if (typeof v === "number") {
                return parseNumberValue(v);
            }
            if (typeof v === "string") {
                return parseStringValue(v);
            }
            if (typeof v === "bigint") {
                return new NativeBigInt(v);
            }
            return v;
        }
        // Pre-define numbers in range [-999,999]
        for (var i = 0; i < 1000; i++) {
            Integer[i] = parseValue(i);
            if (i > 0) Integer[-i] = parseValue(-i);
        }
        // Backwards compatibility
        Integer.one = Integer[1];
        Integer.zero = Integer[0];
        Integer.minusOne = Integer[-1];
        Integer.max = max;
        Integer.min = min;
        Integer.gcd = gcd;
        Integer.lcm = lcm;
        Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
        Integer.randBetween = randBetween;

        Integer.fromArray = function (digits, base, isNegative) {
            return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
        };

        return Integer;
    })();

    // Node.js check
    if (module.hasOwnProperty("exports")) {
        module.exports = bigInt;
    }
    }(BigInteger));

    var bigInt = BigInteger.exports;

    /* eslint complexity: [2, 18], max-statements: [2, 33] */
    var shams$1 = function hasSymbols() {
    	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
    	if (typeof Symbol.iterator === 'symbol') { return true; }

    	var obj = {};
    	var sym = Symbol('test');
    	var symObj = Object(sym);
    	if (typeof sym === 'string') { return false; }

    	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
    	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

    	// temp disabled per https://github.com/ljharb/object.assign/issues/17
    	// if (sym instanceof Symbol) { return false; }
    	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
    	// if (!(symObj instanceof Symbol)) { return false; }

    	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
    	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

    	var symVal = 42;
    	obj[sym] = symVal;
    	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
    	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

    	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

    	var syms = Object.getOwnPropertySymbols(obj);
    	if (syms.length !== 1 || syms[0] !== sym) { return false; }

    	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

    	if (typeof Object.getOwnPropertyDescriptor === 'function') {
    		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
    		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
    	}

    	return true;
    };

    var origSymbol = typeof Symbol !== 'undefined' && Symbol;
    var hasSymbolSham = shams$1;

    var hasSymbols$4 = function hasNativeSymbols() {
    	if (typeof origSymbol !== 'function') { return false; }
    	if (typeof Symbol !== 'function') { return false; }
    	if (typeof origSymbol('foo') !== 'symbol') { return false; }
    	if (typeof Symbol('bar') !== 'symbol') { return false; }

    	return hasSymbolSham();
    };

    /* eslint no-invalid-this: 1 */

    var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
    var slice = Array.prototype.slice;
    var toStr$5 = Object.prototype.toString;
    var funcType = '[object Function]';

    var implementation$1 = function bind(that) {
        var target = this;
        if (typeof target !== 'function' || toStr$5.call(target) !== funcType) {
            throw new TypeError(ERROR_MESSAGE + target);
        }
        var args = slice.call(arguments, 1);

        var bound;
        var binder = function () {
            if (this instanceof bound) {
                var result = target.apply(
                    this,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return this;
            } else {
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );
            }
        };

        var boundLength = Math.max(0, target.length - args.length);
        var boundArgs = [];
        for (var i = 0; i < boundLength; i++) {
            boundArgs.push('$' + i);
        }

        bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

        if (target.prototype) {
            var Empty = function Empty() {};
            Empty.prototype = target.prototype;
            bound.prototype = new Empty();
            Empty.prototype = null;
        }

        return bound;
    };

    var implementation = implementation$1;

    var functionBind = Function.prototype.bind || implementation;

    var bind$1 = functionBind;

    var src = bind$1.call(Function.call, Object.prototype.hasOwnProperty);

    var undefined$1;

    var $SyntaxError = SyntaxError;
    var $Function = Function;
    var $TypeError$7 = TypeError;

    // eslint-disable-next-line consistent-return
    var getEvalledConstructor = function (expressionSyntax) {
    	try {
    		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
    	} catch (e) {}
    };

    var $gOPD = Object.getOwnPropertyDescriptor;
    if ($gOPD) {
    	try {
    		$gOPD({}, '');
    	} catch (e) {
    		$gOPD = null; // this is IE 8, which has a broken gOPD
    	}
    }

    var throwTypeError = function () {
    	throw new $TypeError$7();
    };
    var ThrowTypeError = $gOPD
    	? (function () {
    		try {
    			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
    			arguments.callee; // IE 8 does not throw here
    			return throwTypeError;
    		} catch (calleeThrows) {
    			try {
    				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
    				return $gOPD(arguments, 'callee').get;
    			} catch (gOPDthrows) {
    				return throwTypeError;
    			}
    		}
    	}())
    	: throwTypeError;

    var hasSymbols$3 = hasSymbols$4();

    var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

    var needsEval = {};

    var TypedArray = typeof Uint8Array === 'undefined' ? undefined$1 : getProto(Uint8Array);

    var INTRINSICS$1 = {
    	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
    	'%Array%': Array,
    	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
    	'%ArrayIteratorPrototype%': hasSymbols$3 ? getProto([][Symbol.iterator]()) : undefined$1,
    	'%AsyncFromSyncIteratorPrototype%': undefined$1,
    	'%AsyncFunction%': needsEval,
    	'%AsyncGenerator%': needsEval,
    	'%AsyncGeneratorFunction%': needsEval,
    	'%AsyncIteratorPrototype%': needsEval,
    	'%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
    	'%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
    	'%Boolean%': Boolean,
    	'%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
    	'%Date%': Date,
    	'%decodeURI%': decodeURI,
    	'%decodeURIComponent%': decodeURIComponent,
    	'%encodeURI%': encodeURI,
    	'%encodeURIComponent%': encodeURIComponent,
    	'%Error%': Error,
    	'%eval%': eval, // eslint-disable-line no-eval
    	'%EvalError%': EvalError,
    	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
    	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
    	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
    	'%Function%': $Function,
    	'%GeneratorFunction%': needsEval,
    	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
    	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
    	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
    	'%isFinite%': isFinite,
    	'%isNaN%': isNaN,
    	'%IteratorPrototype%': hasSymbols$3 ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
    	'%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
    	'%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
    	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols$3 ? undefined$1 : getProto(new Map()[Symbol.iterator]()),
    	'%Math%': Math,
    	'%Number%': Number,
    	'%Object%': Object,
    	'%parseFloat%': parseFloat,
    	'%parseInt%': parseInt,
    	'%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
    	'%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
    	'%RangeError%': RangeError,
    	'%ReferenceError%': ReferenceError,
    	'%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
    	'%RegExp%': RegExp,
    	'%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
    	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols$3 ? undefined$1 : getProto(new Set()[Symbol.iterator]()),
    	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
    	'%String%': String,
    	'%StringIteratorPrototype%': hasSymbols$3 ? getProto(''[Symbol.iterator]()) : undefined$1,
    	'%Symbol%': hasSymbols$3 ? Symbol : undefined$1,
    	'%SyntaxError%': $SyntaxError,
    	'%ThrowTypeError%': ThrowTypeError,
    	'%TypedArray%': TypedArray,
    	'%TypeError%': $TypeError$7,
    	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
    	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
    	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
    	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
    	'%URIError%': URIError,
    	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
    	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
    	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet
    };

    var doEval = function doEval(name) {
    	var value;
    	if (name === '%AsyncFunction%') {
    		value = getEvalledConstructor('async function () {}');
    	} else if (name === '%GeneratorFunction%') {
    		value = getEvalledConstructor('function* () {}');
    	} else if (name === '%AsyncGeneratorFunction%') {
    		value = getEvalledConstructor('async function* () {}');
    	} else if (name === '%AsyncGenerator%') {
    		var fn = doEval('%AsyncGeneratorFunction%');
    		if (fn) {
    			value = fn.prototype;
    		}
    	} else if (name === '%AsyncIteratorPrototype%') {
    		var gen = doEval('%AsyncGenerator%');
    		if (gen) {
    			value = getProto(gen.prototype);
    		}
    	}

    	INTRINSICS$1[name] = value;

    	return value;
    };

    var LEGACY_ALIASES = {
    	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
    	'%ArrayPrototype%': ['Array', 'prototype'],
    	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
    	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
    	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
    	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
    	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
    	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
    	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
    	'%BooleanPrototype%': ['Boolean', 'prototype'],
    	'%DataViewPrototype%': ['DataView', 'prototype'],
    	'%DatePrototype%': ['Date', 'prototype'],
    	'%ErrorPrototype%': ['Error', 'prototype'],
    	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
    	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
    	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
    	'%FunctionPrototype%': ['Function', 'prototype'],
    	'%Generator%': ['GeneratorFunction', 'prototype'],
    	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
    	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
    	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
    	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
    	'%JSONParse%': ['JSON', 'parse'],
    	'%JSONStringify%': ['JSON', 'stringify'],
    	'%MapPrototype%': ['Map', 'prototype'],
    	'%NumberPrototype%': ['Number', 'prototype'],
    	'%ObjectPrototype%': ['Object', 'prototype'],
    	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
    	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
    	'%PromisePrototype%': ['Promise', 'prototype'],
    	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
    	'%Promise_all%': ['Promise', 'all'],
    	'%Promise_reject%': ['Promise', 'reject'],
    	'%Promise_resolve%': ['Promise', 'resolve'],
    	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
    	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
    	'%RegExpPrototype%': ['RegExp', 'prototype'],
    	'%SetPrototype%': ['Set', 'prototype'],
    	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
    	'%StringPrototype%': ['String', 'prototype'],
    	'%SymbolPrototype%': ['Symbol', 'prototype'],
    	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
    	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
    	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
    	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
    	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
    	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
    	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
    	'%URIErrorPrototype%': ['URIError', 'prototype'],
    	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
    	'%WeakSetPrototype%': ['WeakSet', 'prototype']
    };

    var bind = functionBind;
    var hasOwn = src;
    var $concat = bind.call(Function.call, Array.prototype.concat);
    var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
    var $replace$1 = bind.call(Function.call, String.prototype.replace);
    var $strSlice$1 = bind.call(Function.call, String.prototype.slice);

    /* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
    var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
    var stringToPath = function stringToPath(string) {
    	var first = $strSlice$1(string, 0, 1);
    	var last = $strSlice$1(string, -1);
    	if (first === '%' && last !== '%') {
    		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
    	} else if (last === '%' && first !== '%') {
    		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
    	}
    	var result = [];
    	$replace$1(string, rePropName, function (match, number, quote, subString) {
    		result[result.length] = quote ? $replace$1(subString, reEscapeChar, '$1') : number || match;
    	});
    	return result;
    };
    /* end adaptation */

    var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
    	var intrinsicName = name;
    	var alias;
    	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
    		alias = LEGACY_ALIASES[intrinsicName];
    		intrinsicName = '%' + alias[0] + '%';
    	}

    	if (hasOwn(INTRINSICS$1, intrinsicName)) {
    		var value = INTRINSICS$1[intrinsicName];
    		if (value === needsEval) {
    			value = doEval(intrinsicName);
    		}
    		if (typeof value === 'undefined' && !allowMissing) {
    			throw new $TypeError$7('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
    		}

    		return {
    			alias: alias,
    			name: intrinsicName,
    			value: value
    		};
    	}

    	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
    };

    var getIntrinsic = function GetIntrinsic(name, allowMissing) {
    	if (typeof name !== 'string' || name.length === 0) {
    		throw new $TypeError$7('intrinsic name must be a non-empty string');
    	}
    	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
    		throw new $TypeError$7('"allowMissing" argument must be a boolean');
    	}

    	var parts = stringToPath(name);
    	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

    	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
    	var intrinsicRealName = intrinsic.name;
    	var value = intrinsic.value;
    	var skipFurtherCaching = false;

    	var alias = intrinsic.alias;
    	if (alias) {
    		intrinsicBaseName = alias[0];
    		$spliceApply(parts, $concat([0, 1], alias));
    	}

    	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
    		var part = parts[i];
    		var first = $strSlice$1(part, 0, 1);
    		var last = $strSlice$1(part, -1);
    		if (
    			(
    				(first === '"' || first === "'" || first === '`')
    				|| (last === '"' || last === "'" || last === '`')
    			)
    			&& first !== last
    		) {
    			throw new $SyntaxError('property names with quotes must have matching quotes');
    		}
    		if (part === 'constructor' || !isOwn) {
    			skipFurtherCaching = true;
    		}

    		intrinsicBaseName += '.' + part;
    		intrinsicRealName = '%' + intrinsicBaseName + '%';

    		if (hasOwn(INTRINSICS$1, intrinsicRealName)) {
    			value = INTRINSICS$1[intrinsicRealName];
    		} else if (value != null) {
    			if (!(part in value)) {
    				if (!allowMissing) {
    					throw new $TypeError$7('base intrinsic for ' + name + ' exists, but the property is not available.');
    				}
    				return void undefined$1;
    			}
    			if ($gOPD && (i + 1) >= parts.length) {
    				var desc = $gOPD(value, part);
    				isOwn = !!desc;

    				// By convention, when a data property is converted to an accessor
    				// property to emulate a data property that does not suffer from
    				// the override mistake, that accessor's getter is marked with
    				// an `originalValue` property. Here, when we detect this, we
    				// uphold the illusion by pretending to see that original data
    				// property, i.e., returning the value rather than the getter
    				// itself.
    				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
    					value = desc.get;
    				} else {
    					value = value[part];
    				}
    			} else {
    				isOwn = hasOwn(value, part);
    				value = value[part];
    			}

    			if (isOwn && !skipFurtherCaching) {
    				INTRINSICS$1[intrinsicRealName] = value;
    			}
    		}
    	}
    	return value;
    };

    var callBind$2 = {exports: {}};

    (function (module) {

    var bind = functionBind;
    var GetIntrinsic = getIntrinsic;

    var $apply = GetIntrinsic('%Function.prototype.apply%');
    var $call = GetIntrinsic('%Function.prototype.call%');
    var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

    var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
    var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
    var $max = GetIntrinsic('%Math.max%');

    if ($defineProperty) {
    	try {
    		$defineProperty({}, 'a', { value: 1 });
    	} catch (e) {
    		// IE 8 has a broken defineProperty
    		$defineProperty = null;
    	}
    }

    module.exports = function callBind(originalFunction) {
    	var func = $reflectApply(bind, $call, arguments);
    	if ($gOPD && $defineProperty) {
    		var desc = $gOPD(func, 'length');
    		if (desc.configurable) {
    			// original length, plus the receiver, minus any additional arguments (after the receiver)
    			$defineProperty(
    				func,
    				'length',
    				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
    			);
    		}
    	}
    	return func;
    };

    var applyBind = function applyBind() {
    	return $reflectApply(bind, $apply, arguments);
    };

    if ($defineProperty) {
    	$defineProperty(module.exports, 'apply', { value: applyBind });
    } else {
    	module.exports.apply = applyBind;
    }
    }(callBind$2));

    var GetIntrinsic$f = getIntrinsic;

    var callBind$1 = callBind$2.exports;

    var $indexOf = callBind$1(GetIntrinsic$f('String.prototype.indexOf'));

    var callBound$2 = function callBoundIntrinsic(name, allowMissing) {
    	var intrinsic = GetIntrinsic$f(name, !!allowMissing);
    	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
    		return callBind$1(intrinsic);
    	}
    	return intrinsic;
    };

    var GetIntrinsic$e = getIntrinsic;

    var $Array = GetIntrinsic$e('%Array%');

    // eslint-disable-next-line global-require
    var toStr$4 = !$Array.isArray && callBound$2('Object.prototype.toString');

    // https://ecma-international.org/ecma-262/6.0/#sec-isarray

    var IsArray$1 = $Array.isArray || function IsArray(argument) {
    	return toStr$4(argument) === '[object Array]';
    };

    var GetIntrinsic$d = getIntrinsic;
    var callBound$1 = callBound$2;

    var $TypeError$6 = GetIntrinsic$d('%TypeError%');

    var IsArray = IsArray$1;

    var $apply = GetIntrinsic$d('%Reflect.apply%', true) || callBound$1('%Function.prototype.apply%');

    // https://ecma-international.org/ecma-262/6.0/#sec-call

    var Call = function Call(F, V) {
    	var argumentsList = arguments.length > 2 ? arguments[2] : [];
    	if (!IsArray(argumentsList)) {
    		throw new $TypeError$6('Assertion failed: optional `argumentsList`, if provided, must be a List');
    	}
    	return $apply(F, V, argumentsList);
    };

    var Call$1 = Call;

    // https://ecma-international.org/ecma-262/6.0/#sec-ispropertykey

    var IsPropertyKey$3 = function IsPropertyKey(argument) {
    	return typeof argument === 'string' || typeof argument === 'symbol';
    };

    var GetIntrinsic$c = getIntrinsic;

    var $TypeError$5 = GetIntrinsic$c('%TypeError%');

    // http://262.ecma-international.org/5.1/#sec-9.10

    var CheckObjectCoercible = function CheckObjectCoercible(value, optMessage) {
    	if (value == null) {
    		throw new $TypeError$5(optMessage || ('Cannot call method on ' + value));
    	}
    	return value;
    };

    var RequireObjectCoercible$1 = CheckObjectCoercible;

    var GetIntrinsic$b = getIntrinsic;

    var $Object = GetIntrinsic$b('%Object%');

    var RequireObjectCoercible = RequireObjectCoercible$1;

    // https://ecma-international.org/ecma-262/6.0/#sec-toobject

    var ToObject$1 = function ToObject(value) {
    	RequireObjectCoercible(value);
    	return $Object(value);
    };

    var GetIntrinsic$a = getIntrinsic;

    var $TypeError$4 = GetIntrinsic$a('%TypeError%');

    var IsPropertyKey$2 = IsPropertyKey$3;
    var ToObject = ToObject$1;

    /**
     * 7.3.2 GetV (V, P)
     * 1. Assert: IsPropertyKey(P) is true.
     * 2. Let O be ToObject(V).
     * 3. ReturnIfAbrupt(O).
     * 4. Return O.[[Get]](P, V).
     */

    var GetV$1 = function GetV(V, P) {
    	// 7.3.2.1
    	if (!IsPropertyKey$2(P)) {
    		throw new $TypeError$4('Assertion failed: IsPropertyKey(P) is not true');
    	}

    	// 7.3.2.2-3
    	var O = ToObject(V);

    	// 7.3.2.4
    	return O[P];
    };

    var fnToStr = Function.prototype.toString;
    var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
    var badArrayLike;
    var isCallableMarker;
    if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
    	try {
    		badArrayLike = Object.defineProperty({}, 'length', {
    			get: function () {
    				throw isCallableMarker;
    			}
    		});
    		isCallableMarker = {};
    		// eslint-disable-next-line no-throw-literal
    		reflectApply(function () { throw 42; }, null, badArrayLike);
    	} catch (_) {
    		if (_ !== isCallableMarker) {
    			reflectApply = null;
    		}
    	}
    } else {
    	reflectApply = null;
    }

    var constructorRegex = /^\s*class\b/;
    var isES6ClassFn = function isES6ClassFunction(value) {
    	try {
    		var fnStr = fnToStr.call(value);
    		return constructorRegex.test(fnStr);
    	} catch (e) {
    		return false; // not a function
    	}
    };

    var tryFunctionObject = function tryFunctionToStr(value) {
    	try {
    		if (isES6ClassFn(value)) { return false; }
    		fnToStr.call(value);
    		return true;
    	} catch (e) {
    		return false;
    	}
    };
    var toStr$3 = Object.prototype.toString;
    var fnClass = '[object Function]';
    var genClass = '[object GeneratorFunction]';
    var hasToStringTag$1 = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`
    /* globals document: false */
    var documentDotAll = typeof document === 'object' && typeof document.all === 'undefined' && document.all !== undefined ? document.all : {};

    var isCallable$2 = reflectApply
    	? function isCallable(value) {
    		if (value === documentDotAll) { return true; }
    		if (!value) { return false; }
    		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
    		if (typeof value === 'function' && !value.prototype) { return true; }
    		try {
    			reflectApply(value, null, badArrayLike);
    		} catch (e) {
    			if (e !== isCallableMarker) { return false; }
    		}
    		return !isES6ClassFn(value);
    	}
    	: function isCallable(value) {
    		if (value === documentDotAll) { return true; }
    		if (!value) { return false; }
    		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
    		if (typeof value === 'function' && !value.prototype) { return true; }
    		if (hasToStringTag$1) { return tryFunctionObject(value); }
    		if (isES6ClassFn(value)) { return false; }
    		var strClass = toStr$3.call(value);
    		return strClass === fnClass || strClass === genClass;
    	};

    // http://262.ecma-international.org/5.1/#sec-9.11

    var IsCallable$1 = isCallable$2;

    var GetIntrinsic$9 = getIntrinsic;

    var $TypeError$3 = GetIntrinsic$9('%TypeError%');

    var GetV = GetV$1;
    var IsCallable = IsCallable$1;
    var IsPropertyKey$1 = IsPropertyKey$3;

    /**
     * 7.3.9 - https://ecma-international.org/ecma-262/6.0/#sec-getmethod
     * 1. Assert: IsPropertyKey(P) is true.
     * 2. Let func be GetV(O, P).
     * 3. ReturnIfAbrupt(func).
     * 4. If func is either undefined or null, return undefined.
     * 5. If IsCallable(func) is false, throw a TypeError exception.
     * 6. Return func.
     */

    var GetMethod$1 = function GetMethod(O, P) {
    	// 7.3.9.1
    	if (!IsPropertyKey$1(P)) {
    		throw new $TypeError$3('Assertion failed: IsPropertyKey(P) is not true');
    	}

    	// 7.3.9.2
    	var func = GetV(O, P);

    	// 7.3.9.4
    	if (func == null) {
    		return void 0;
    	}

    	// 7.3.9.5
    	if (!IsCallable(func)) {
    		throw new $TypeError$3(P + 'is not a function');
    	}

    	// 7.3.9.6
    	return func;
    };

    var GetMethod$2 = GetMethod$1;

    var GetIntrinsic$8 = getIntrinsic;

    var $abs$1 = GetIntrinsic$8('%Math.abs%');

    // http://262.ecma-international.org/5.1/#sec-5.2

    var abs$3 = function abs(x) {
    	return $abs$1(x);
    };

    // var modulo = require('./modulo');
    var $floor$1 = Math.floor;

    // http://262.ecma-international.org/5.1/#sec-5.2

    var floor$3 = function floor(x) {
    	// return x - modulo(x, 1);
    	return $floor$1(x);
    };

    var _isNaN = Number.isNaN || function isNaN(a) {
    	return a !== a;
    };

    var $isNaN$2 = Number.isNaN || function (a) { return a !== a; };

    var _isFinite = Number.isFinite || function (x) { return typeof x === 'number' && !$isNaN$2(x) && x !== Infinity && x !== -Infinity; };

    var abs$2 = abs$3;
    var floor$2 = floor$3;

    var $isNaN$1 = _isNaN;
    var $isFinite$1 = _isFinite;

    // https://ecma-international.org/ecma-262/6.0/#sec-isinteger

    var IsInteger = function IsInteger(argument) {
    	if (typeof argument !== 'number' || $isNaN$1(argument) || !$isFinite$1(argument)) {
    		return false;
    	}
    	var absValue = abs$2(argument);
    	return floor$2(absValue) === absValue;
    };

    var IsInteger$1 = IsInteger;

    var GetIntrinsic$7 = getIntrinsic;

    var $abs = GetIntrinsic$7('%Math.abs%');

    // http://262.ecma-international.org/5.1/#sec-5.2

    var abs$1 = function abs(x) {
    	return $abs(x);
    };

    // var modulo = require('./modulo');
    var $floor = Math.floor;

    // http://262.ecma-international.org/5.1/#sec-5.2

    var floor$1 = function floor(x) {
    	// return x - modulo(x, 1);
    	return $floor(x);
    };

    var isPrimitive$4 = function isPrimitive(value) {
    	return value === null || (typeof value !== 'function' && typeof value !== 'object');
    };

    var toStr$2 = Object.prototype.toString;

    var isPrimitive$3 = isPrimitive$4;

    var isCallable$1 = isCallable$2;

    // http://ecma-international.org/ecma-262/5.1/#sec-8.12.8
    var ES5internalSlots = {
    	'[[DefaultValue]]': function (O) {
    		var actualHint;
    		if (arguments.length > 1) {
    			actualHint = arguments[1];
    		} else {
    			actualHint = toStr$2.call(O) === '[object Date]' ? String : Number;
    		}

    		if (actualHint === String || actualHint === Number) {
    			var methods = actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
    			var value, i;
    			for (i = 0; i < methods.length; ++i) {
    				if (isCallable$1(O[methods[i]])) {
    					value = O[methods[i]]();
    					if (isPrimitive$3(value)) {
    						return value;
    					}
    				}
    			}
    			throw new TypeError('No default value');
    		}
    		throw new TypeError('invalid [[DefaultValue]] hint supplied');
    	}
    };

    // http://ecma-international.org/ecma-262/5.1/#sec-9.1
    var es5 = function ToPrimitive(input) {
    	if (isPrimitive$3(input)) {
    		return input;
    	}
    	if (arguments.length > 1) {
    		return ES5internalSlots['[[DefaultValue]]'](input, arguments[1]);
    	}
    	return ES5internalSlots['[[DefaultValue]]'](input);
    };

    // http://262.ecma-international.org/5.1/#sec-9.1

    var ToPrimitive$4 = es5;

    var ToPrimitive$3 = ToPrimitive$4;

    // http://262.ecma-international.org/5.1/#sec-9.3

    var ToNumber$4 = function ToNumber(value) {
    	var prim = ToPrimitive$3(value, Number);
    	if (typeof prim !== 'string') {
    		return +prim; // eslint-disable-line no-implicit-coercion
    	}

    	// eslint-disable-next-line no-control-regex
    	var trimmed = prim.replace(/^[ \t\x0b\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u0085]+|[ \t\x0b\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u0085]+$/g, '');
    	if ((/^0[ob]|^[+-]0x/).test(trimmed)) {
    		return NaN;
    	}

    	return +trimmed; // eslint-disable-line no-implicit-coercion
    };

    var sign = function sign(number) {
    	return number >= 0 ? 1 : -1;
    };

    var abs = abs$1;
    var floor = floor$1;
    var ToNumber$3 = ToNumber$4;

    var $isNaN = _isNaN;
    var $isFinite = _isFinite;
    var $sign = sign;

    // http://262.ecma-international.org/5.1/#sec-9.4

    var ToInteger$3 = function ToInteger(value) {
    	var number = ToNumber$3(value);
    	if ($isNaN(number)) { return 0; }
    	if (number === 0 || !$isFinite(number)) { return number; }
    	return $sign(number) * floor(abs(number));
    };

    var GetIntrinsic$6 = getIntrinsic;

    var $test = GetIntrinsic$6('RegExp.prototype.test');

    var callBind = callBind$2.exports;

    var regexTester$1 = function regexTester(regex) {
    	return callBind($test, regex);
    };

    var isPrimitive$2 = function isPrimitive(value) {
    	return value === null || (typeof value !== 'function' && typeof value !== 'object');
    };

    var hasSymbols$2 = shams$1;

    var shams = function hasToStringTagShams() {
    	return hasSymbols$2() && !!Symbol.toStringTag;
    };

    var getDay = Date.prototype.getDay;
    var tryDateObject = function tryDateGetDayCall(value) {
    	try {
    		getDay.call(value);
    		return true;
    	} catch (e) {
    		return false;
    	}
    };

    var toStr$1 = Object.prototype.toString;
    var dateClass = '[object Date]';
    var hasToStringTag = shams();

    var isDateObject = function isDateObject(value) {
    	if (typeof value !== 'object' || value === null) {
    		return false;
    	}
    	return hasToStringTag ? tryDateObject(value) : toStr$1.call(value) === dateClass;
    };

    var isSymbol$1 = {exports: {}};

    var toStr = Object.prototype.toString;
    var hasSymbols$1 = hasSymbols$4();

    if (hasSymbols$1) {
    	var symToStr = Symbol.prototype.toString;
    	var symStringRegex = /^Symbol\(.*\)$/;
    	var isSymbolObject = function isRealSymbolObject(value) {
    		if (typeof value.valueOf() !== 'symbol') {
    			return false;
    		}
    		return symStringRegex.test(symToStr.call(value));
    	};

    	isSymbol$1.exports = function isSymbol(value) {
    		if (typeof value === 'symbol') {
    			return true;
    		}
    		if (toStr.call(value) !== '[object Symbol]') {
    			return false;
    		}
    		try {
    			return isSymbolObject(value);
    		} catch (e) {
    			return false;
    		}
    	};
    } else {

    	isSymbol$1.exports = function isSymbol(value) {
    		// this environment does not support Symbols.
    		return false ;
    	};
    }

    var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

    var isPrimitive$1 = isPrimitive$4;
    var isCallable = isCallable$2;
    var isDate = isDateObject;
    var isSymbol = isSymbol$1.exports;

    var ordinaryToPrimitive = function OrdinaryToPrimitive(O, hint) {
    	if (typeof O === 'undefined' || O === null) {
    		throw new TypeError('Cannot call method on ' + O);
    	}
    	if (typeof hint !== 'string' || (hint !== 'number' && hint !== 'string')) {
    		throw new TypeError('hint must be "string" or "number"');
    	}
    	var methodNames = hint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
    	var method, result, i;
    	for (i = 0; i < methodNames.length; ++i) {
    		method = O[methodNames[i]];
    		if (isCallable(method)) {
    			result = method.call(O);
    			if (isPrimitive$1(result)) {
    				return result;
    			}
    		}
    	}
    	throw new TypeError('No default value');
    };

    var GetMethod = function GetMethod(O, P) {
    	var func = O[P];
    	if (func !== null && typeof func !== 'undefined') {
    		if (!isCallable(func)) {
    			throw new TypeError(func + ' returned for property ' + P + ' of object ' + O + ' is not a function');
    		}
    		return func;
    	}
    	return void 0;
    };

    // http://www.ecma-international.org/ecma-262/6.0/#sec-toprimitive
    var es2015 = function ToPrimitive(input) {
    	if (isPrimitive$1(input)) {
    		return input;
    	}
    	var hint = 'default';
    	if (arguments.length > 1) {
    		if (arguments[1] === String) {
    			hint = 'string';
    		} else if (arguments[1] === Number) {
    			hint = 'number';
    		}
    	}

    	var exoticToPrim;
    	if (hasSymbols) {
    		if (Symbol.toPrimitive) {
    			exoticToPrim = GetMethod(input, Symbol.toPrimitive);
    		} else if (isSymbol(input)) {
    			exoticToPrim = Symbol.prototype.valueOf;
    		}
    	}
    	if (typeof exoticToPrim !== 'undefined') {
    		var result = exoticToPrim.call(input, hint);
    		if (isPrimitive$1(result)) {
    			return result;
    		}
    		throw new TypeError('unable to convert exotic object to primitive');
    	}
    	if (hint === 'default' && (isDate(input) || isSymbol(input))) {
    		hint = 'string';
    	}
    	return ordinaryToPrimitive(input, hint === 'default' ? 'number' : hint);
    };

    var toPrimitive = es2015;

    // https://ecma-international.org/ecma-262/6.0/#sec-toprimitive

    var ToPrimitive$1 = function ToPrimitive(input) {
    	if (arguments.length > 1) {
    		return toPrimitive(input, arguments[1]);
    	}
    	return toPrimitive(input);
    };

    var ToPrimitive$2 = ToPrimitive$1;

    var GetIntrinsic$5 = getIntrinsic;

    var $TypeError$2 = GetIntrinsic$5('%TypeError%');
    var $Number$1 = GetIntrinsic$5('%Number%');
    var $RegExp = GetIntrinsic$5('%RegExp%');
    var $parseInteger = GetIntrinsic$5('%parseInt%');

    var callBound = callBound$2;
    var regexTester = regexTester$1;
    var isPrimitive = isPrimitive$2;

    var $strSlice = callBound('String.prototype.slice');
    var isBinary = regexTester(/^0b[01]+$/i);
    var isOctal = regexTester(/^0o[0-7]+$/i);
    var isInvalidHexLiteral = regexTester(/^[-+]0x[0-9a-f]+$/i);
    var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
    var nonWSregex = new $RegExp('[' + nonWS + ']', 'g');
    var hasNonWS = regexTester(nonWSregex);

    // whitespace from: https://es5.github.io/#x15.5.4.20
    // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
    var ws = [
    	'\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
    	'\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
    	'\u2029\uFEFF'
    ].join('');
    var trimRegex = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
    var $replace = callBound('String.prototype.replace');
    var $trim = function (value) {
    	return $replace(value, trimRegex, '');
    };

    var ToPrimitive = ToPrimitive$1;

    // https://ecma-international.org/ecma-262/6.0/#sec-tonumber

    var ToNumber$1 = function ToNumber(argument) {
    	var value = isPrimitive(argument) ? argument : ToPrimitive(argument, $Number$1);
    	if (typeof value === 'symbol') {
    		throw new $TypeError$2('Cannot convert a Symbol value to a number');
    	}
    	if (typeof value === 'bigint') {
    		throw new $TypeError$2('Conversion from \'BigInt\' to \'number\' is not allowed.');
    	}
    	if (typeof value === 'string') {
    		if (isBinary(value)) {
    			return ToNumber($parseInteger($strSlice(value, 2), 2));
    		} else if (isOctal(value)) {
    			return ToNumber($parseInteger($strSlice(value, 2), 8));
    		} else if (hasNonWS(value) || isInvalidHexLiteral(value)) {
    			return NaN;
    		}
    		var trimmed = $trim(value);
    		if (trimmed !== value) {
    			return ToNumber(trimmed);
    		}

    	}
    	return $Number$1(value);
    };

    var ToNumber$2 = ToNumber$1;

    var ES5ToInteger = ToInteger$3;

    var ToNumber = ToNumber$1;

    // https://262.ecma-international.org/11.0/#sec-tointeger

    var ToInteger$1 = function ToInteger(value) {
    	var number = ToNumber(value);
    	if (number !== 0) {
    		number = ES5ToInteger(number);
    	}
    	return number === 0 ? 0 : number;
    };

    var ToInteger$2 = ToInteger$1;

    var GetIntrinsic$4 = getIntrinsic;

    var $Math = GetIntrinsic$4('%Math%');
    var $Number = GetIntrinsic$4('%Number%');

    var maxSafeInteger = $Number.MAX_SAFE_INTEGER || $Math.pow(2, 53) - 1;

    var MAX_SAFE_INTEGER = maxSafeInteger;

    var ToInteger = ToInteger$1;

    var ToLength = function ToLength(argument) {
    	var len = ToInteger(argument);
    	if (len <= 0) { return 0; } // includes converting -0 to +0
    	if (len > MAX_SAFE_INTEGER) { return MAX_SAFE_INTEGER; }
    	return len;
    };

    var ToLength$1 = ToLength;

    var GetIntrinsic$3 = getIntrinsic;

    var $String = GetIntrinsic$3('%String%');
    var $TypeError$1 = GetIntrinsic$3('%TypeError%');

    // https://ecma-international.org/ecma-262/6.0/#sec-tostring

    var ToString = function ToString(argument) {
    	if (typeof argument === 'symbol') {
    		throw new $TypeError$1('Cannot convert a Symbol value to a string');
    	}
    	return $String(argument);
    };

    var ToString$1 = ToString;

    // https://262.ecma-international.org/5.1/#sec-8

    var Type$3 = function Type(x) {
    	if (x === null) {
    		return 'Null';
    	}
    	if (typeof x === 'undefined') {
    		return 'Undefined';
    	}
    	if (typeof x === 'function' || typeof x === 'object') {
    		return 'Object';
    	}
    	if (typeof x === 'number') {
    		return 'Number';
    	}
    	if (typeof x === 'boolean') {
    		return 'Boolean';
    	}
    	if (typeof x === 'string') {
    		return 'String';
    	}
    };

    var ES5Type = Type$3;

    // https://262.ecma-international.org/11.0/#sec-ecmascript-data-types-and-values

    var Type$1 = function Type(x) {
    	if (typeof x === 'symbol') {
    		return 'Symbol';
    	}
    	if (typeof x === 'bigint') {
    		return 'BigInt';
    	}
    	return ES5Type(x);
    };

    var Type$2 = Type$1;

    var GetIntrinsic$2 = getIntrinsic;

    var $TypeError = GetIntrinsic$2('%TypeError%');

    var has = src;

    var IsPropertyKey = IsPropertyKey$3;
    var Type = Type$1;

    // https://ecma-international.org/ecma-262/6.0/#sec-hasownproperty

    var HasOwnProperty = function HasOwnProperty(O, P) {
    	if (Type(O) !== 'Object') {
    		throw new $TypeError('Assertion failed: `O` must be an Object');
    	}
    	if (!IsPropertyKey(P)) {
    		throw new $TypeError('Assertion failed: `P` must be a Property Key');
    	}
    	return has(O, P);
    };

    var HasOwnProperty$1 = HasOwnProperty;

    // TODO: remove, semver-major

    var GetIntrinsic$1 = getIntrinsic;

    var ESGetIntrinsic = GetIntrinsic$1;

    /* global false */

    const INTRINSICS = {};

    function MakeIntrinsicClass(Class, name) {
      Object.defineProperty(Class.prototype, Symbol.toStringTag, {
        value: name,
        writable: false,
        enumerable: false,
        configurable: true
      });
      for (let prop of Object.getOwnPropertyNames(Class)) {
        const desc = Object.getOwnPropertyDescriptor(Class, prop);
        if (!desc.configurable || !desc.enumerable) continue;
        desc.enumerable = false;
        Object.defineProperty(Class, prop, desc);
      }
      for (let prop of Object.getOwnPropertyNames(Class.prototype)) {
        const desc = Object.getOwnPropertyDescriptor(Class.prototype, prop);
        if (!desc.configurable || !desc.enumerable) continue;
        desc.enumerable = false;
        Object.defineProperty(Class.prototype, prop, desc);
      }

      DefineIntrinsic(name, Class);
      DefineIntrinsic(`${name}.prototype`, Class.prototype);
    }

    function DefineIntrinsic(name, value) {
      const key = `%${name}%`;
      if (INTRINSICS[key] !== undefined) throw new Error(`intrinsic ${name} already exists`);
      INTRINSICS[key] = value;
    }

    function GetIntrinsic(intrinsic) {
      return intrinsic in INTRINSICS ? INTRINSICS[intrinsic] : ESGetIntrinsic(intrinsic);
    }

    // Instant
    const EPOCHNANOSECONDS = 'slot-epochNanoSeconds';

    // TimeZone
    const TIMEZONE_ID = 'slot-timezone-identifier';

    // DateTime, Date, Time, YearMonth, MonthDay
    const ISO_YEAR = 'slot-year';
    const ISO_MONTH = 'slot-month';
    const ISO_DAY = 'slot-day';
    const ISO_HOUR = 'slot-hour';
    const ISO_MINUTE = 'slot-minute';
    const ISO_SECOND = 'slot-second';
    const ISO_MILLISECOND = 'slot-millisecond';
    const ISO_MICROSECOND = 'slot-microsecond';
    const ISO_NANOSECOND = 'slot-nanosecond';
    const CALENDAR = 'slot-calendar';
    // Date, YearMonth, and MonthDay all have the same slots, disambiguation needed:
    const DATE_BRAND = 'slot-date-brand';
    const YEAR_MONTH_BRAND = 'slot-year-month-brand';
    const MONTH_DAY_BRAND = 'slot-month-day-brand';

    // ZonedDateTime
    const INSTANT = 'slot-cached-instant';
    const TIME_ZONE = 'slot-time-zone';

    // Duration
    const YEARS = 'slot-years';
    const MONTHS = 'slot-months';
    const WEEKS = 'slot-weeks';
    const DAYS = 'slot-days';
    const HOURS = 'slot-hours';
    const MINUTES = 'slot-minutes';
    const SECONDS = 'slot-seconds';
    const MILLISECONDS = 'slot-milliseconds';
    const MICROSECONDS = 'slot-microseconds';
    const NANOSECONDS = 'slot-nanoseconds';

    // Calendar
    const CALENDAR_ID = 'slot-calendar-identifier';

    const slots = new WeakMap();
    function CreateSlots(container) {
      slots.set(container, Object.create(null));
    }
    function GetSlots(container) {
      return slots.get(container);
    }
    function HasSlot(container, ...ids) {
      if (!container || 'object' !== typeof container) return false;
      const myslots = GetSlots(container);
      return !!myslots && ids.reduce((all, id) => all && id in myslots, true);
    }
    function GetSlot(container, id) {
      return GetSlots(container)[id];
    }
    function SetSlot(container, id, value) {
      GetSlots(container)[id] = value;
    }

    /* global false */

    const ArrayIncludes = Array.prototype.includes;
    const ArrayPrototypePush$2 = Array.prototype.push;
    const IntlDateTimeFormat$2 = globalThis.Intl.DateTimeFormat;
    const MathAbs$1 = Math.abs;
    const MathFloor$1 = Math.floor;
    const ObjectAssign$3 = Object.assign;
    const ObjectEntries$1 = Object.entries;
    const ObjectKeys = Object.keys;

    const impl = {};

    class Calendar {
      constructor(id) {
        // Note: if the argument is not passed, IsBuiltinCalendar("undefined") will fail. This check
        //       exists only to improve the error message.
        if (arguments.length < 1) {
          throw new RangeError('missing argument: id is required');
        }

        id = ES.ToString(id);
        if (!IsBuiltinCalendar(id)) throw new RangeError(`invalid calendar identifier ${id}`);
        CreateSlots(this);
        SetSlot(this, CALENDAR_ID, id);
      }
      get id() {
        return ES.ToString(this);
      }
      dateFromFields(fields, options = undefined) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (ES.Type(fields) !== 'Object') throw new TypeError('invalid fields');
        options = ES.GetOptionsObject(options);
        return impl[GetSlot(this, CALENDAR_ID)].dateFromFields(fields, options, this);
      }
      yearMonthFromFields(fields, options = undefined) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (ES.Type(fields) !== 'Object') throw new TypeError('invalid fields');
        options = ES.GetOptionsObject(options);
        return impl[GetSlot(this, CALENDAR_ID)].yearMonthFromFields(fields, options, this);
      }
      monthDayFromFields(fields, options = undefined) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (ES.Type(fields) !== 'Object') throw new TypeError('invalid fields');
        options = ES.GetOptionsObject(options);
        return impl[GetSlot(this, CALENDAR_ID)].monthDayFromFields(fields, options, this);
      }
      fields(fields) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        const fieldsArray = [];
        const allowed = new Set([
          'year',
          'month',
          'monthCode',
          'day',
          'hour',
          'minute',
          'second',
          'millisecond',
          'microsecond',
          'nanosecond'
        ]);
        for (const name of fields) {
          if (ES.Type(name) !== 'String') throw new TypeError('invalid fields');
          if (!allowed.has(name)) throw new RangeError(`invalid field name ${name}`);
          allowed.delete(name);
          ArrayPrototypePush$2.call(fieldsArray, name);
        }
        return impl[GetSlot(this, CALENDAR_ID)].fields(fieldsArray);
      }
      mergeFields(fields, additionalFields) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        return impl[GetSlot(this, CALENDAR_ID)].mergeFields(fields, additionalFields);
      }
      dateAdd(date, duration, options = undefined) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        date = ES.ToTemporalDate(date);
        duration = ES.ToTemporalDuration(duration);
        options = ES.GetOptionsObject(options);
        const overflow = ES.ToTemporalOverflow(options);
        const { days } = ES.BalanceDuration(
          GetSlot(duration, DAYS),
          GetSlot(duration, HOURS),
          GetSlot(duration, MINUTES),
          GetSlot(duration, SECONDS),
          GetSlot(duration, MILLISECONDS),
          GetSlot(duration, MICROSECONDS),
          GetSlot(duration, NANOSECONDS),
          'day'
        );
        return impl[GetSlot(this, CALENDAR_ID)].dateAdd(
          date,
          GetSlot(duration, YEARS),
          GetSlot(duration, MONTHS),
          GetSlot(duration, WEEKS),
          days,
          overflow,
          this
        );
      }
      dateUntil(one, two, options = undefined) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        one = ES.ToTemporalDate(one);
        two = ES.ToTemporalDate(two);
        options = ES.GetOptionsObject(options);
        const largestUnit = ES.ToLargestTemporalUnit(
          options,
          'auto',
          ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'],
          'day'
        );
        const { years, months, weeks, days } = impl[GetSlot(this, CALENDAR_ID)].dateUntil(one, two, largestUnit);
        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
      }
      year(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].year(date);
      }
      month(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (ES.IsTemporalMonthDay(date)) throw new TypeError('use monthCode on PlainMonthDay instead');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].month(date);
      }
      monthCode(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date) && !ES.IsTemporalMonthDay(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].monthCode(date);
      }
      day(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalMonthDay(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].day(date);
      }
      era(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].era(date);
      }
      eraYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].eraYear(date);
      }
      dayOfWeek(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].dayOfWeek(date);
      }
      dayOfYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].dayOfYear(date);
      }
      weekOfYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].weekOfYear(date);
      }
      daysInWeek(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].daysInWeek(date);
      }
      daysInMonth(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].daysInMonth(date);
      }
      daysInYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].daysInYear(date);
      }
      monthsInYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].monthsInYear(date);
      }
      inLeapYear(date) {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        if (!ES.IsTemporalYearMonth(date)) date = ES.ToTemporalDate(date);
        return impl[GetSlot(this, CALENDAR_ID)].inLeapYear(date);
      }
      toString() {
        if (!ES.IsTemporalCalendar(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR_ID);
      }
      toJSON() {
        return ES.ToString(this);
      }
      static from(item) {
        return ES.ToTemporalCalendar(item);
      }
    }

    MakeIntrinsicClass(Calendar, 'Temporal.Calendar');
    DefineIntrinsic('Temporal.Calendar.from', Calendar.from);

    impl['iso8601'] = {
      dateFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        fields = ES.PrepareTemporalFields(fields, [['day'], ['month', undefined], ['monthCode', undefined], ['year']]);
        fields = resolveNonLunisolarMonth(fields);
        let { year, month, day } = fields;
        ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
        return ES.CreateTemporalDate(year, month, day, calendar);
      },
      yearMonthFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        fields = ES.PrepareTemporalFields(fields, [['month', undefined], ['monthCode', undefined], ['year']]);
        fields = resolveNonLunisolarMonth(fields);
        let { year, month } = fields;
        ({ year, month } = ES.RegulateISOYearMonth(year, month, overflow));
        return ES.CreateTemporalYearMonth(year, month, calendar, /* referenceISODay = */ 1);
      },
      monthDayFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        fields = ES.PrepareTemporalFields(fields, [
          ['day'],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ]);
        if (fields.month !== undefined && fields.year === undefined && fields.monthCode === undefined) {
          throw new TypeError('either year or monthCode required with month');
        }
        const useYear = fields.monthCode === undefined;
        const referenceISOYear = 1972;
        fields = resolveNonLunisolarMonth(fields);
        let { month, day, year } = fields;
        ({ month, day } = ES.RegulateISODate(useYear ? year : referenceISOYear, month, day, overflow));
        return ES.CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
      },
      fields(fields) {
        return fields;
      },
      mergeFields(fields, additionalFields) {
        const merged = {};
        for (const nextKey of ObjectKeys(fields)) {
          if (nextKey === 'month' || nextKey === 'monthCode') continue;
          merged[nextKey] = fields[nextKey];
        }
        const newKeys = ObjectKeys(additionalFields);
        for (const nextKey of newKeys) {
          merged[nextKey] = additionalFields[nextKey];
        }
        if (!ArrayIncludes.call(newKeys, 'month') && !ArrayIncludes.call(newKeys, 'monthCode')) {
          const { month, monthCode } = fields;
          if (month !== undefined) merged.month = month;
          if (monthCode !== undefined) merged.monthCode = monthCode;
        }
        return merged;
      },
      dateAdd(date, years, months, weeks, days, overflow, calendar) {
        let year = GetSlot(date, ISO_YEAR);
        let month = GetSlot(date, ISO_MONTH);
        let day = GetSlot(date, ISO_DAY);
        ({ year, month, day } = ES.AddISODate(year, month, day, years, months, weeks, days, overflow));
        return ES.CreateTemporalDate(year, month, day, calendar);
      },
      dateUntil(one, two, largestUnit) {
        return ES.DifferenceISODate(
          GetSlot(one, ISO_YEAR),
          GetSlot(one, ISO_MONTH),
          GetSlot(one, ISO_DAY),
          GetSlot(two, ISO_YEAR),
          GetSlot(two, ISO_MONTH),
          GetSlot(two, ISO_DAY),
          largestUnit
        );
      },
      year(date) {
        return GetSlot(date, ISO_YEAR);
      },
      era() {
        return undefined;
      },
      eraYear() {
        return undefined;
      },
      month(date) {
        return GetSlot(date, ISO_MONTH);
      },
      monthCode(date) {
        return buildMonthCode(GetSlot(date, ISO_MONTH));
      },
      day(date) {
        return GetSlot(date, ISO_DAY);
      },
      dayOfWeek(date) {
        return ES.DayOfWeek(GetSlot(date, ISO_YEAR), GetSlot(date, ISO_MONTH), GetSlot(date, ISO_DAY));
      },
      dayOfYear(date) {
        return ES.DayOfYear(GetSlot(date, ISO_YEAR), GetSlot(date, ISO_MONTH), GetSlot(date, ISO_DAY));
      },
      weekOfYear(date) {
        return ES.WeekOfYear(GetSlot(date, ISO_YEAR), GetSlot(date, ISO_MONTH), GetSlot(date, ISO_DAY));
      },
      daysInWeek() {
        return 7;
      },
      daysInMonth(date) {
        return ES.ISODaysInMonth(GetSlot(date, ISO_YEAR), GetSlot(date, ISO_MONTH));
      },
      daysInYear(date) {
        if (!HasSlot(date, ISO_YEAR)) date = ES.ToTemporalDate(date);
        return ES.LeapYear(GetSlot(date, ISO_YEAR)) ? 366 : 365;
      },
      monthsInYear() {
        return 12;
      },
      inLeapYear(date) {
        if (!HasSlot(date, ISO_YEAR)) date = ES.ToTemporalDate(date);
        return ES.LeapYear(GetSlot(date, ISO_YEAR));
      }
    };

    // Note: other built-in calendars than iso8601 are not part of the Temporal
    // proposal for ECMA-262. These calendars will be standardized as part of
    // ECMA-402.

    function monthCodeNumberPart(monthCode) {
      if (!monthCode.startsWith('M')) {
        throw new RangeError(`Invalid month code: ${monthCode}.  Month codes must start with M.`);
      }
      const month = +monthCode.slice(1);
      if (isNaN(month)) throw new RangeError(`Invalid month code: ${monthCode}`);
      return month;
    }

    function buildMonthCode(month, leap = false) {
      return `M${month.toString().padStart(2, '0')}${leap ? 'L' : ''}`;
    }

    /**
     * Safely merge a month, monthCode pair into an integer month.
     * If both are present, make sure they match.
     * This logic doesn't work for lunisolar calendars!
     * */
    function resolveNonLunisolarMonth(calendarDate, overflow = undefined, monthsPerYear = 12) {
      let { month, monthCode } = calendarDate;
      if (monthCode === undefined) {
        if (month === undefined) throw new TypeError('Either month or monthCode are required');
        // The ISO calendar uses the default (undefined) value because it does
        // constrain/reject after this method returns. Non-ISO calendars, however,
        // rely on this function to constrain/reject out-of-range `month` values.
        if (overflow === 'reject') ES.RejectToRange(month, 1, monthsPerYear);
        if (overflow === 'constrain') month = ES.ConstrainToRange(month, 1, monthsPerYear);
        monthCode = buildMonthCode(month);
      } else {
        const numberPart = monthCodeNumberPart(monthCode);
        if (month !== undefined && month !== numberPart) {
          throw new RangeError(`monthCode ${monthCode} and month ${month} must match if both are present`);
        }
        if (monthCode !== buildMonthCode(numberPart)) {
          throw new RangeError(`Invalid month code: ${monthCode}`);
        }
        month = numberPart;
        if (month < 1 || month > monthsPerYear) throw new RangeError(`Invalid monthCode: ${monthCode}`);
      }
      return { ...calendarDate, month, monthCode };
    }

    // Note: other built-in calendars than iso8601 are not part of the Temporal
    // proposal for ECMA-262. An implementation of these calendars is present in
    // this polyfill in order to validate the Temporal API and to get early feedback
    // about non-ISO calendars. However, non-ISO calendar implementation is subject
    // to change because these calendars are implementation-defined.

    /**
     * This prototype implementation of non-ISO calendars makes many repeated calls
     * to Intl APIs which may be slow (e.g. >0.2ms). This trivial cache will speed
     * up these repeat accesses. Each cache instance is associated (via a WeakMap)
     * to a specific Temporal object, which speeds up multiple calendar calls on the
     * same Temporal object instance.  No invalidation or pruning is necessary
     * because each object's cache is thrown away when the object is GC-ed.
     */
    class OneObjectCache {
      constructor(cacheToClone = undefined) {
        this.map = new Map();
        this.calls = 0;
        this.now = globalThis.performance ? globalThis.performance.now() : Date.now();
        this.hits = 0;
        this.misses = 0;
        if (cacheToClone !== undefined) {
          let i = cacheToClone.length;
          for (const entry of cacheToClone.map.entries()) {
            if (++i > OneObjectCache.MAX_CACHE_ENTRIES) break;
            this.map.set(...entry);
          }
        }
      }
      get(key) {
        const result = this.map.get(key);
        if (result) {
          this.hits++;
          this.report();
        }
        this.calls++;
        return result;
      }
      set(key, value) {
        this.map.set(key, value);
        this.misses++;
        this.report();
      }
      report() {
        /*
        if (this.calls === 0) return;
        const ms = (globalThis.performance ? globalThis.performance.now() : Date.now()) - this.now;
        const hitRate = ((100 * this.hits) / this.calls).toFixed(0);
        console.log(`${this.calls} calls in ${ms.toFixed(2)}ms. Hits: ${this.hits} (${hitRate}%). Misses: ${this.misses}.`);
        */
      }
      setObject(obj) {
        if (OneObjectCache.objectMap.get(obj)) throw new RangeError('object already cached');
        OneObjectCache.objectMap.set(obj, this);
        this.report();
      }
    }
    OneObjectCache.objectMap = new WeakMap();
    OneObjectCache.MAX_CACHE_ENTRIES = 1000;
    /**
     * Returns a WeakMap-backed cache that's used to store expensive results
     * that are associated with a particular Temporal object instance.
     *
     * @param obj - object to associate with the cache
     */
    OneObjectCache.getCacheForObject = function (obj) {
      let cache = OneObjectCache.objectMap.get(obj);
      if (!cache) {
        cache = new OneObjectCache();
        OneObjectCache.objectMap.set(obj, cache);
      }
      return cache;
    };

    function toUtcIsoDateString({ isoYear, isoMonth, isoDay }) {
      const yearString = ES.ISOYearString(isoYear);
      const monthString = ES.ISODateTimePartString(isoMonth);
      const dayString = ES.ISODateTimePartString(isoDay);
      return `${yearString}-${monthString}-${dayString}T00:00Z`;
    }

    function simpleDateDiff(one, two) {
      return {
        years: one.year - two.year,
        months: one.month - two.month,
        days: one.day - two.day
      };
    }

    /**
     * Implementation that's common to all non-trivial non-ISO calendars
     */
    const nonIsoHelperBase = {
      // The properties and methods below here should be the same for all lunar/lunisolar calendars.
      getFormatter() {
        // `new Intl.DateTimeFormat()` is amazingly slow and chews up RAM. Per
        // https://bugs.chromium.org/p/v8/issues/detail?id=6528#c4, we cache one
        // DateTimeFormat instance per calendar. Caching is lazy so we only pay for
        // calendars that are used. Note that the nonIsoHelperBase object is spread
        // into each each calendar's implementation before any cache is created, so
        // each calendar gets its own separate cached formatter.
        if (typeof this.formatter === 'undefined') {
          this.formatter = new IntlDateTimeFormat$2(`en-US-u-ca-${this.id}`, {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            era: this.eraLength,
            timeZone: 'UTC'
          });
        }
        return this.formatter;
      },
      isoToCalendarDate(isoDate, cache) {
        let { year: isoYear, month: isoMonth, day: isoDay } = isoDate;
        const key = JSON.stringify({ func: 'isoToCalendarDate', isoYear, isoMonth, isoDay, id: this.id });
        const cached = cache.get(key);
        if (cached) return cached;

        const dateTimeFormat = this.getFormatter();
        let parts, isoString;
        try {
          isoString = toUtcIsoDateString({ isoYear, isoMonth, isoDay });
          parts = dateTimeFormat.formatToParts(new Date(isoString));
        } catch (e) {
          throw new RangeError(`Invalid ISO date: ${JSON.stringify({ isoYear, isoMonth, isoDay })}`);
        }
        const result = {};
        for (let { type, value } of parts) {
          if (type === 'year') result.eraYear = +value;
          if (type === 'relatedYear') result.eraYear = +value;
          if (type === 'month') {
            const matches = /^([-0-9.]+)(.*?)$/.exec(value);
            if (!matches || matches.length != 3) throw new RangeError(`Unexpected month: ${value}`);
            result.month = +matches[1];
            if (result.month < 1) {
              throw new RangeError(
                `Invalid month ${value} from ${isoString}[u-ca-${this.id}]` +
                  ' (probably due to https://bugs.chromium.org/p/v8/issues/detail?id=10527)'
              );
            }
            if (result.month > 13) {
              throw new RangeError(
                `Invalid month ${value} from ${isoString}[u-ca-${this.id}]` +
                  ' (probably due to https://bugs.chromium.org/p/v8/issues/detail?id=10529)'
              );
            }
            if (matches[2]) result.monthExtra = matches[2];
          }
          if (type === 'day') result.day = +value;
          if (this.hasEra && type === 'era' && value != null && value !== '') {
            // The convention for Temporal era values is lowercase, so following
            // that convention in this prototype. Punctuation is removed, accented
            // letters are normalized, and spaces are replaced with dashes.
            // E.g.: "ERA0" => "era0", "Before R.O.C." => "before-roc", "En’ō" => "eno"
            // The call to normalize() and the replacement regex deals with era
            // names that contain non-ASCII characters like Japanese eras. Also
            // ignore extra content in parentheses like JPN era date ranges.
            value = value.split(' (')[0];
            result.era = value
              .normalize('NFD')
              .replace(/[^-0-9 \p{L}]/gu, '')
              .replace(' ', '-')
              .toLowerCase();
          }
        }
        if (result.eraYear === undefined) {
          // Node 12 has outdated ICU data that lacks the `relatedYear` field in the
          // output of Intl.DateTimeFormat.formatToParts.
          throw new RangeError(
            `Intl.DateTimeFormat.formatToParts lacks relatedYear in ${this.id} calendar. Try Node 14+ or modern browsers.`
          );
        }
        // Translate eras that may be handled differently by Temporal vs. by Intl
        // (e.g. Japanese pre-Meiji eras). See #526 for details.
        if (this.reviseIntlEra) {
          const { era, eraYear } = this.reviseIntlEra(result, isoDate);
          result.era = era;
          result.eraYear = eraYear;
        }
        if (this.checkIcuBugs) this.checkIcuBugs(result, isoDate);

        const calendarDate = this.adjustCalendarDate(result, cache, 'constrain', true);
        if (calendarDate.year === undefined) throw new RangeError(`Missing year converting ${JSON.stringify(isoDate)}`);
        if (calendarDate.month === undefined) throw new RangeError(`Missing month converting ${JSON.stringify(isoDate)}`);
        if (calendarDate.day === undefined) throw new RangeError(`Missing day converting ${JSON.stringify(isoDate)}`);
        cache.set(key, calendarDate);
        // Also cache the reverse mapping
        ['constrain', 'reject'].forEach((overflow) => {
          const keyReverse = JSON.stringify({
            func: 'calendarToIsoDate',
            year: calendarDate.year,
            month: calendarDate.month,
            day: calendarDate.day,
            overflow,
            id: this.id
          });
          cache.set(keyReverse, isoDate);
        });
        return calendarDate;
      },
      validateCalendarDate(calendarDate) {
        let { era, month, year, day, eraYear, monthCode, monthExtra } = calendarDate;
        // When there's a suffix (e.g. "5bis" for a leap month in Chinese calendar)
        // the derived class must deal with it.
        if (monthExtra !== undefined) throw new RangeError('Unexpected `monthExtra` value');
        if (year === undefined && eraYear === undefined) throw new TypeError('year or eraYear is required');
        if (month === undefined && monthCode === undefined) throw new TypeError('month or monthCode is required');
        if (day === undefined) throw new RangeError('Missing day');
        if (monthCode !== undefined) {
          if (typeof monthCode !== 'string') {
            throw new RangeError(`monthCode must be a string, not ${ES.Type(monthCode).toLowerCase()}`);
          }
          if (!/^M([01]?\d)(L?)$/.test(monthCode)) throw new RangeError(`Invalid monthCode: ${monthCode}`);
        }
        if (this.constantEra) {
          if (era !== undefined && era !== this.constantEra) {
            throw new RangeError(`era must be ${this.constantEra}, not ${era}`);
          }
          if (eraYear !== undefined && year !== undefined && eraYear !== year) {
            throw new RangeError(`eraYear ${eraYear} does not match year ${year}`);
          }
        }
      },
      /**
       * Allows derived calendars to add additional fields and/or to make
       * adjustments e.g. to set the era based on the date or to revise the month
       * number in lunisolar calendars per
       * https://github.com/tc39/proposal-temporal/issues/1203.
       *
       * The base implementation fills in missing values by assuming the simplest
       * possible calendar:
       * - no eras or a constant era defined in `.constantEra`
       * - non-lunisolar calendar (no leap months)
       * */
      adjustCalendarDate(calendarDate, cache, overflow /*, fromLegacyDate = false */) {
        if (this.calendarType === 'lunisolar') throw new RangeError('Override required for lunisolar calendars');
        this.validateCalendarDate(calendarDate);
        const largestMonth = this.monthsInYear(calendarDate, cache);
        let { month, year, eraYear, monthCode } = calendarDate;

        // For calendars that always use the same era, set it here so that derived
        // calendars won't need to implement this method simply to set the era.
        if (this.constantEra) {
          // year and eraYear always match when there's only one possible era
          if (year === undefined) year = eraYear;
          if (eraYear === undefined) eraYear = year;
          calendarDate = { ...calendarDate, era: this.constantEra, year, eraYear };
        }

        ({ month, monthCode } = resolveNonLunisolarMonth(calendarDate, overflow, largestMonth));
        return { ...calendarDate, month, monthCode };
      },
      regulateMonthDayNaive(calendarDate, overflow, cache) {
        const largestMonth = this.monthsInYear(calendarDate, cache);
        let { month, day } = calendarDate;
        if (overflow === 'reject') {
          ES.RejectToRange(month, 1, largestMonth);
          ES.RejectToRange(day, 1, this.maximumMonthLength(calendarDate));
        } else {
          month = ES.ConstrainToRange(month, 1, largestMonth);
          day = ES.ConstrainToRange(day, 1, this.maximumMonthLength({ ...calendarDate, month }));
        }
        return { ...calendarDate, month, day };
      },
      calendarToIsoDate(date, overflow = 'constrain', cache) {
        const originalDate = date;
        // First, normalize the calendar date to ensure that (year, month, day)
        // are all present, converting monthCode and eraYear if needed.
        date = this.adjustCalendarDate(date, cache, overflow, false);

        // Fix obviously out-of-bounds values. Values that are valid generally, but
        // not in this particular year, may not be caught here for some calendars.
        // If so, these will be handled lower below.
        date = this.regulateMonthDayNaive(date, overflow, cache);

        const { year, month, day } = date;
        const key = JSON.stringify({ func: 'calendarToIsoDate', year, month, day, overflow, id: this.id });
        let cached = cache.get(key);
        if (cached) return cached;
        // If YMD are present in the input but the input has been constrained
        // already, then cache both the original value and the constrained value.
        let keyOriginal;
        if (
          originalDate.year !== undefined &&
          originalDate.month !== undefined &&
          originalDate.day !== undefined &&
          (originalDate.year !== date.year || originalDate.month !== date.month || originalDate.day !== date.day)
        ) {
          keyOriginal = JSON.stringify({
            func: 'calendarToIsoDate',
            year: originalDate.year,
            month: originalDate.month,
            day: originalDate.day,
            overflow,
            id: this.id
          });
          cached = cache.get(keyOriginal);
          if (cached) return cached;
        }

        // First, try to roughly guess the result
        let isoEstimate = this.estimateIsoDate({ year, month, day });
        const calculateSameMonthResult = (diffDays) => {
          // If the estimate is in the same year & month as the target, then we can
          // calculate the result exactly and short-circuit any additional logic.
          // This optimization assumes that months are continuous. It would break if
          // a calendar skipped days, like the Julian->Gregorian switchover. But the
          // only ICU calendars that currently skip days (japanese/roc/buddhist) is
          // a bug (https://bugs.chromium.org/p/chromium/issues/detail?id=1173158)
          // that's currently detected by `checkIcuBugs()` which will throw. So
          // this optimization should be safe for all ICU calendars.
          let testIsoEstimate = this.addDaysIso(isoEstimate, diffDays);
          if (date.day > this.minimumMonthLength(date)) {
            // There's a chance that the calendar date is out of range. Throw or
            // constrain if so.
            let testCalendarDate = this.isoToCalendarDate(testIsoEstimate, cache);
            while (testCalendarDate.month !== month || testCalendarDate.year !== year) {
              if (overflow === 'reject') {
                throw new RangeError(`day ${day} does not exist in month ${month} of year ${year}`);
              }
              // Back up a day at a time until we're not hanging over the month end
              testIsoEstimate = this.addDaysIso(testIsoEstimate, -1);
              testCalendarDate = this.isoToCalendarDate(testIsoEstimate, cache);
            }
          }
          return testIsoEstimate;
        };
        let sign = 0;
        let roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
        let diff = simpleDateDiff(date, roundtripEstimate);
        if (diff.years !== 0 || diff.months !== 0 || diff.days !== 0) {
          const diffTotalDaysEstimate = diff.years * 365 + diff.months * 30 + diff.days;
          isoEstimate = this.addDaysIso(isoEstimate, diffTotalDaysEstimate);
          roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
          diff = simpleDateDiff(date, roundtripEstimate);
          if (diff.years === 0 && diff.months === 0) {
            isoEstimate = calculateSameMonthResult(diff.days);
          } else {
            sign = this.compareCalendarDates(date, roundtripEstimate);
          }
        }
        // If the initial guess is not in the same month, then then bisect the
        // distance to the target, starting with 8 days per step.
        let increment = 8;
        let maybeConstrained = false;
        while (sign) {
          isoEstimate = this.addDaysIso(isoEstimate, sign * increment);
          const oldRoundtripEstimate = roundtripEstimate;
          roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
          const oldSign = sign;
          sign = this.compareCalendarDates(date, roundtripEstimate);
          if (sign) {
            diff = simpleDateDiff(date, roundtripEstimate);
            if (diff.years === 0 && diff.months === 0) {
              isoEstimate = calculateSameMonthResult(diff.days);
              // Signal the loop condition that there's a match.
              sign = 0;
              // If the calendar day is larger than the minimal length for this
              // month, then it might be larger than the actual length of the month.
              // So we won't cache it as the correct calendar date for this ISO
              // date.
              maybeConstrained = date.day > this.minimumMonthLength(date);
            } else if (oldSign && sign !== oldSign) {
              if (increment > 1) {
                // If the estimate overshot the target, try again with a smaller increment
                // in the reverse direction.
                increment /= 2;
              } else {
                // Increment is 1, and neither the previous estimate nor the new
                // estimate is correct. The only way that can happen is if the
                // original date was an invalid value that will be constrained or
                // rejected here.
                if (overflow === 'reject') {
                  throw new RangeError(`Can't find ISO date from calendar date: ${JSON.stringify({ ...originalDate })}`);
                } else {
                  // To constrain, pick the earliest value
                  const order = this.compareCalendarDates(roundtripEstimate, oldRoundtripEstimate);
                  // If current value is larger, then back up to the previous value.
                  if (order > 0) isoEstimate = this.addDaysIso(isoEstimate, -1);
                  maybeConstrained = true;
                  sign = 0;
                }
              }
            }
          }
        }
        cache.set(key, isoEstimate);
        if (keyOriginal) cache.set(keyOriginal, isoEstimate);
        if (
          date.year === undefined ||
          date.month === undefined ||
          date.day === undefined ||
          date.monthCode === undefined ||
          (this.hasEra && (date.era === undefined || date.eraYear === undefined))
        ) {
          throw new RangeError('Unexpected missing property');
        }
        if (!maybeConstrained) {
          // Also cache the reverse mapping
          const keyReverse = JSON.stringify({
            func: 'isoToCalendarDate',
            isoYear: isoEstimate.year,
            isoMonth: isoEstimate.month,
            isoDay: isoEstimate.day,
            id: this.id
          });
          cache.set(keyReverse, date);
        }
        return isoEstimate;
      },
      temporalToCalendarDate(date, cache) {
        const isoDate = { year: GetSlot(date, ISO_YEAR), month: GetSlot(date, ISO_MONTH), day: GetSlot(date, ISO_DAY) };
        const result = this.isoToCalendarDate(isoDate, cache);
        return result;
      },
      compareCalendarDates(date1, date2) {
        // `date1` and `date2` are already records. The calls below simply validate
        // that all three required fields are present.
        date1 = ES.PrepareTemporalFields(date1, [['day'], ['month'], ['year']]);
        date2 = ES.PrepareTemporalFields(date2, [['day'], ['month'], ['year']]);
        if (date1.year !== date2.year) return ES.ComparisonResult(date1.year - date2.year);
        if (date1.month !== date2.month) return ES.ComparisonResult(date1.month - date2.month);
        if (date1.day !== date2.day) return ES.ComparisonResult(date1.day - date2.day);
        return 0;
      },
      /** Ensure that a calendar date actually exists. If not, return the closest earlier date. */
      regulateDate(calendarDate, overflow = 'constrain', cache) {
        const isoDate = this.calendarToIsoDate(calendarDate, overflow, cache);
        return this.isoToCalendarDate(isoDate, cache);
      },
      addDaysIso(isoDate, days) {
        const added = ES.AddISODate(isoDate.year, isoDate.month, isoDate.day, 0, 0, 0, days, 'constrain');
        return added;
      },
      addDaysCalendar(calendarDate, days, cache) {
        const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
        const addedIso = this.addDaysIso(isoDate, days);
        const addedCalendar = this.isoToCalendarDate(addedIso, cache);
        return addedCalendar;
      },
      addMonthsCalendar(calendarDate, months, overflow, cache) {
        const { day } = calendarDate;
        for (let i = 0, absMonths = MathAbs$1(months); i < absMonths; i++) {
          const { month } = calendarDate;
          const oldCalendarDate = calendarDate;
          const days =
            months < 0
              ? -Math.max(day, this.daysInPreviousMonth(calendarDate, cache))
              : this.daysInMonth(calendarDate, cache);
          const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
          let addedIso = this.addDaysIso(isoDate, days, cache);
          calendarDate = this.isoToCalendarDate(addedIso, cache);

          // Normally, we can advance one month by adding the number of days in the
          // current month. However, if we're at the end of the current month and
          // the next month has fewer days, then we rolled over to the after-next
          // month. Below we detect this condition and back up until we're back in
          // the desired month.
          if (months > 0) {
            const monthsInOldYear = this.monthsInYear(oldCalendarDate, cache);
            while (calendarDate.month - 1 !== month % monthsInOldYear) {
              addedIso = this.addDaysIso(addedIso, -1, cache);
              calendarDate = this.isoToCalendarDate(addedIso, cache);
            }
          }

          if (calendarDate.day !== day) {
            // try to retain the original day-of-month, if possible
            calendarDate = this.regulateDate({ ...calendarDate, day }, 'constrain', cache);
          }
        }
        if (overflow === 'reject' && calendarDate.day !== day) {
          throw new RangeError(`Day ${day} does not exist in resulting calendar month`);
        }
        return calendarDate;
      },
      addCalendar(calendarDate, { years = 0, months = 0, weeks = 0, days = 0 }, overflow, cache) {
        const { year, month, day } = calendarDate;
        const addedMonths = this.addMonthsCalendar({ year: year + years, month, day }, months, overflow, cache);
        days += weeks * 7;
        const addedDays = this.addDaysCalendar(addedMonths, days, cache);
        return addedDays;
      },
      untilCalendar(calendarOne, calendarTwo, largestUnit, cache) {
        let days = 0;
        let weeks = 0;
        let months = 0;
        let years = 0;
        switch (largestUnit) {
          case 'day':
            days = this.calendarDaysUntil(calendarOne, calendarTwo, cache);
            break;
          case 'week': {
            const totalDays = this.calendarDaysUntil(calendarOne, calendarTwo, cache);
            days = totalDays % 7;
            weeks = (totalDays - days) / 7;
            break;
          }
          case 'month':
          case 'year': {
            const diffYears = calendarTwo.year - calendarOne.year;
            const diffMonths = calendarTwo.month - calendarOne.month;
            const diffDays = calendarTwo.day - calendarOne.day;
            const sign = this.compareCalendarDates(calendarTwo, calendarOne);
            if (largestUnit === 'year' && diffYears) {
              const isOneFurtherInYear = diffMonths * sign < 0 || (diffMonths === 0 && diffDays * sign < 0);
              years = isOneFurtherInYear ? diffYears - sign : diffYears;
            }
            const yearsAdded = years ? this.addCalendar(calendarOne, { years }, 'constrain', cache) : calendarOne;
            // Now we have less than one year remaining. Add one month at a time
            // until we go over the target, then back up one month and calculate
            // remaining days and weeks.
            let current;
            let next = yearsAdded;
            do {
              months += sign;
              current = next;
              next = this.addMonthsCalendar(current, sign, 'constrain', cache);
              if (next.day !== calendarOne.day) {
                // In case the day was constrained down, try to un-constrain it
                next = this.regulateDate({ ...next, day: calendarOne.day }, 'constrain', cache);
              }
            } while (this.compareCalendarDates(calendarTwo, next) * sign >= 0);
            months -= sign; // correct for loop above which overshoots by 1
            const remainingDays = this.calendarDaysUntil(current, calendarTwo, cache);
            days = remainingDays;
            break;
          }
        }
        return { years, months, weeks, days };
      },
      daysInMonth(calendarDate, cache) {
        // Add enough days to roll over to the next month. One we're in the next
        // month, we can calculate the length of the current month. NOTE: This
        // algorithm assumes that months are continuous. It would break if a
        // calendar skipped days, like the Julian->Gregorian switchover. But the
        // only ICU calendars that currently skip days (japanese/roc/buddhist) is a
        // bug (https://bugs.chromium.org/p/chromium/issues/detail?id=1173158)
        // that's currently detected by `checkIcuBugs()` which will throw. So this
        // code should be safe for all ICU calendars.
        const { day } = calendarDate;
        const max = this.maximumMonthLength(calendarDate);
        const min = this.minimumMonthLength(calendarDate);
        // easiest case: we already know the month length if min and max are the same.
        if (min === max) return min;

        // Add enough days to get into the next month, without skipping it
        const increment = day <= max - min ? max : min;
        const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
        const addedIsoDate = this.addDaysIso(isoDate, increment);
        const addedCalendarDate = this.isoToCalendarDate(addedIsoDate, cache);

        // Now back up to the last day of the original month
        const endOfMonthIso = this.addDaysIso(addedIsoDate, -addedCalendarDate.day);
        const endOfMonthCalendar = this.isoToCalendarDate(endOfMonthIso, cache);
        return endOfMonthCalendar.day;
      },
      daysInPreviousMonth(calendarDate, cache) {
        const { day, month, year } = calendarDate;

        // Check to see if we already know the month length, and return it if so
        const previousMonthYear = month > 1 ? year : year - 1;
        let previousMonthDate = { year: previousMonthYear, month, day: 1 };
        const previousMonth = month > 1 ? month - 1 : this.monthsInYear(previousMonthDate, cache);
        previousMonthDate = { ...previousMonthDate, month: previousMonth };
        const min = this.minimumMonthLength(previousMonthDate);
        const max = this.maximumMonthLength(previousMonthDate);
        if (min === max) return max;

        const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
        const lastDayOfPreviousMonthIso = this.addDaysIso(isoDate, -day);
        const lastDayOfPreviousMonthCalendar = this.isoToCalendarDate(lastDayOfPreviousMonthIso, cache);
        return lastDayOfPreviousMonthCalendar.day;
      },
      startOfCalendarYear(calendarDate) {
        return { year: calendarDate.year, month: 1, day: 1 };
      },
      startOfCalendarMonth(calendarDate) {
        return { year: calendarDate.year, month: calendarDate.month, day: 1 };
      },
      calendarDaysUntil(calendarOne, calendarTwo, cache) {
        const oneIso = this.calendarToIsoDate(calendarOne, 'constrain', cache);
        const twoIso = this.calendarToIsoDate(calendarTwo, 'constrain', cache);
        return this.isoDaysUntil(oneIso, twoIso);
      },
      isoDaysUntil(oneIso, twoIso) {
        const duration = ES.DifferenceISODate(
          oneIso.year,
          oneIso.month,
          oneIso.day,
          twoIso.year,
          twoIso.month,
          twoIso.day,
          'day'
        );
        return duration.days;
      },
      // The short era format works for all calendars except Japanese, which will
      // override.
      eraLength: 'short',
      // All built-in calendars except Chinese/Dangi and Hebrew use an era
      hasEra: true,
      monthDayFromFields(fields, overflow, cache) {
        let { year, month, monthCode, day, era, eraYear } = fields;
        if (monthCode === undefined) {
          if (year === undefined && (era === undefined || eraYear === undefined)) {
            throw new TypeError('`monthCode`, `year`, or `era` and `eraYear` is required');
          }
          ({ monthCode, year } = this.adjustCalendarDate({ year, month, monthCode, day, era, eraYear }, cache, overflow));
        }

        let isoYear, isoMonth, isoDay;
        let closestCalendar, closestIso;
        // Look backwards starting from the calendar year of 1972-01-01 up to 100
        // calendar years to find a year that has this month and day. Normal months
        // and days will match immediately, but for leap days and leap months we may
        // have to look for a while.
        const startDateIso = { year: 1972, month: 1, day: 1 };
        const { year: calendarYear } = this.isoToCalendarDate(startDateIso, cache);
        for (let i = 0; i < 100; i++) {
          let testCalendarDate = this.adjustCalendarDate({ day, monthCode, year: calendarYear - i }, cache);
          const isoDate = this.calendarToIsoDate(testCalendarDate, 'constrain', cache);
          const roundTripCalendarDate = this.isoToCalendarDate(isoDate, cache);
          ({ year: isoYear, month: isoMonth, day: isoDay } = isoDate);
          if (roundTripCalendarDate.monthCode === monthCode && roundTripCalendarDate.day === day) {
            return { month: isoMonth, day: isoDay, year: isoYear };
          } else if (overflow === 'constrain') {
            // non-ISO constrain algorithm tries to find the closest date in a matching month
            if (
              closestCalendar === undefined ||
              (roundTripCalendarDate.monthCode === closestCalendar.monthCode &&
                roundTripCalendarDate.day > closestCalendar.day)
            ) {
              closestCalendar = roundTripCalendarDate;
              closestIso = isoDate;
            }
          }
        }
        if (overflow === 'constrain' && closestIso !== undefined) return closestIso;
        throw new RangeError(`No recent ${this.id} year with monthCode ${monthCode} and day ${day}`);
      }
    };

    const helperHebrew = ObjectAssign$3({}, nonIsoHelperBase, {
      id: 'hebrew',
      calendarType: 'lunisolar',
      inLeapYear(calendarDate /*, cache */) {
        const { year } = calendarDate;
        // FYI: In addition to adding a month in leap years, the Hebrew calendar
        // also has per-year changes to the number of days of Heshvan and Kislev.
        // Given that these can be calculated by counting the number of days in
        // those months, I assume that these DO NOT need to be exposed as
        // Hebrew-only prototype fields or methods.
        return (7 * year + 1) % 19 < 7;
      },
      monthsInYear(calendarDate) {
        return this.inLeapYear(calendarDate) ? 13 : 12;
      },
      minimumMonthLength(calendarDate) {
        return this.minMaxMonthLength(calendarDate, 'min');
      },
      maximumMonthLength(calendarDate) {
        return this.minMaxMonthLength(calendarDate, 'max');
      },
      minMaxMonthLength(calendarDate, minOrMax) {
        const { month, year } = calendarDate;
        const monthCode = this.getMonthCode(year, month);
        const monthInfo = ObjectEntries$1(this.months).find((m) => m[1].monthCode === monthCode);
        if (monthInfo === undefined) throw new RangeError(`unmatched Hebrew month: ${month}`);
        const daysInMonth = monthInfo[1].days;
        return typeof daysInMonth === 'number' ? daysInMonth : daysInMonth[minOrMax];
      },
      /** Take a guess at what ISO date a particular calendar date corresponds to */
      estimateIsoDate(calendarDate) {
        const { year } = calendarDate;
        return { year: year - 3760, month: 1, day: 1 };
      },
      months: {
        Tishri: { leap: 1, regular: 1, monthCode: 'M01', days: 30 },
        Heshvan: { leap: 2, regular: 2, monthCode: 'M02', days: { min: 29, max: 30 } },
        Kislev: { leap: 3, regular: 3, monthCode: 'M03', days: { min: 29, max: 30 } },
        Tevet: { leap: 4, regular: 4, monthCode: 'M04', days: 29 },
        Shevat: { leap: 5, regular: 5, monthCode: 'M05', days: 30 },
        Adar: { leap: undefined, regular: 6, monthCode: 'M06', days: 29 },
        'Adar I': { leap: 6, regular: undefined, monthCode: 'M05L', days: 30 },
        'Adar II': { leap: 7, regular: undefined, monthCode: 'M06', days: 29 },
        Nisan: { leap: 8, regular: 7, monthCode: 'M07', days: 30 },
        Iyar: { leap: 9, regular: 8, monthCode: 'M08', days: 29 },
        Sivan: { leap: 10, regular: 9, monthCode: 'M09', days: 30 },
        Tamuz: { leap: 11, regular: 10, monthCode: 'M10', days: 29 },
        Av: { leap: 12, regular: 11, monthCode: 'M11', days: 30 },
        Elul: { leap: 13, regular: 12, monthCode: 'M12', days: 29 }
      },
      getMonthCode(year, month) {
        if (this.inLeapYear({ year })) {
          return month === 6 ? buildMonthCode(5, true) : buildMonthCode(month < 6 ? month : month - 1);
        } else {
          return buildMonthCode(month);
        }
      },
      adjustCalendarDate(calendarDate, cache, overflow = 'constrain', fromLegacyDate = false) {
        let { year, eraYear, month, monthCode, day, monthExtra } = calendarDate;
        if (year === undefined) year = eraYear;
        if (eraYear === undefined) eraYear = year;
        if (fromLegacyDate) {
          // In Pre Node-14 V8, DateTimeFormat.formatToParts `month: 'numeric'`
          // output returns the numeric equivalent of `month` as a string, meaning
          // that `'6'` in a leap year is Adar I, while `'6'` in a non-leap year
          // means Adar. In this case, `month` will already be correct and no action
          // is needed. However, in Node 14 and later formatToParts returns the name
          // of the Hebrew month (e.g. "Tevet"), so we'll need to look up the
          // correct `month` using the string name as a key.
          if (monthExtra) {
            const monthInfo = this.months[monthExtra];
            if (!monthInfo) throw new RangeError(`Unrecognized month from formatToParts: ${monthExtra}`);
            month = this.inLeapYear({ year }) ? monthInfo.leap : monthInfo.regular;
          }
          monthCode = this.getMonthCode(year, month);
          const result = { year, month, day, era: undefined, eraYear, monthCode };
          return result;
        } else {
          // When called without input coming from legacy Date output, simply ensure
          // that all fields are present.
          this.validateCalendarDate(calendarDate);
          if (month === undefined) {
            if (monthCode.endsWith('L')) {
              if (monthCode !== 'M05L') {
                throw new RangeError(`Hebrew leap month must have monthCode M05L, not ${monthCode}`);
              }
              month = 6;
              if (!this.inLeapYear({ year })) {
                if (overflow === 'reject') {
                  throw new RangeError(`Hebrew monthCode M05L is invalid in year ${year} which is not a leap year`);
                } else {
                  // constrain to last day of previous month (Av)
                  month = 5;
                  day = 30;
                  monthCode = 'M05';
                }
              }
            } else {
              month = monthCodeNumberPart(monthCode);
              // if leap month is before this one, the month index is one more than the month code
              if (this.inLeapYear({ year }) && month > 6) month++;
              const largestMonth = this.monthsInYear({ year });
              if (month < 1 || month > largestMonth) throw new RangeError(`Invalid monthCode: ${monthCode}`);
            }
          } else {
            if (overflow === 'reject') {
              ES.RejectToRange(month, 1, this.monthsInYear({ year }));
              ES.RejectToRange(day, 1, this.maximumMonthLength(calendarDate));
            } else {
              month = ES.ConstrainToRange(month, 1, this.monthsInYear({ year }));
              day = ES.ConstrainToRange(day, 1, this.maximumMonthLength({ ...calendarDate, month }));
            }
            if (monthCode === undefined) {
              monthCode = this.getMonthCode(year, month);
            } else {
              const calculatedMonthCode = this.getMonthCode(year, month);
              if (calculatedMonthCode !== monthCode) {
                throw new RangeError(`monthCode ${monthCode} doesn't correspond to month ${month} in Hebrew year ${year}`);
              }
            }
          }
          return { ...calendarDate, day, month, monthCode, year, eraYear };
        }
      },
      // All built-in calendars except Chinese/Dangi and Hebrew use an era
      hasEra: false
    });

    /**
     * For Temporal purposes, the Islamic calendar is simple because it's always the
     * same 12 months in the same order.
     */
    const helperIslamic = ObjectAssign$3({}, nonIsoHelperBase, {
      id: 'islamic',
      calendarType: 'lunar',
      inLeapYear(calendarDate, cache) {
        // In leap years, the 12th month has 30 days. In non-leap years: 29.
        const days = this.daysInMonth({ year: calendarDate.year, month: 12, day: 1 }, cache);
        return days === 30;
      },
      monthsInYear(/* calendarYear, cache */) {
        return 12;
      },
      minimumMonthLength: (/* calendarDate */) => 29,
      maximumMonthLength: (/* calendarDate */) => 30,
      DAYS_PER_ISLAMIC_YEAR: 354 + 11 / 30,
      DAYS_PER_ISO_YEAR: 365.2425,
      constantEra: 'ah',
      estimateIsoDate(calendarDate) {
        const { year } = this.adjustCalendarDate(calendarDate);
        return { year: MathFloor$1((year * this.DAYS_PER_ISLAMIC_YEAR) / this.DAYS_PER_ISO_YEAR) + 622, month: 1, day: 1 };
      }
    });

    const helperPersian = ObjectAssign$3({}, nonIsoHelperBase, {
      id: 'persian',
      calendarType: 'solar',
      inLeapYear(calendarDate, cache) {
        // Same logic (count days in the last month) for Persian as for Islamic,
        // even though Persian is solar and Islamic is lunar.
        return helperIslamic.inLeapYear(calendarDate, cache);
      },
      monthsInYear(/* calendarYear, cache */) {
        return 12;
      },
      minimumMonthLength(calendarDate) {
        const { month } = calendarDate;
        if (month === 12) return 29;
        return month <= 6 ? 31 : 30;
      },
      maximumMonthLength(calendarDate) {
        const { month } = calendarDate;
        if (month === 12) return 30;
        return month <= 6 ? 31 : 30;
      },
      constantEra: 'ap',
      estimateIsoDate(calendarDate) {
        const { year } = this.adjustCalendarDate(calendarDate);
        return { year: year + 621, month: 1, day: 1 };
      }
    });

    const helperIndian = ObjectAssign$3({}, nonIsoHelperBase, {
      id: 'indian',
      calendarType: 'solar',
      inLeapYear(calendarDate /*, cache*/) {
        // From https://en.wikipedia.org/wiki/Indian_national_calendar:
        // Years are counted in the Saka era, which starts its year 0 in the year 78
        // of the Common Era. To determine leap years, add 78 to the Saka year – if
        // the result is a leap year in the Gregorian calendar, then the Saka year
        // is a leap year as well.
        return isGregorianLeapYear(calendarDate.year + 78);
      },
      monthsInYear(/* calendarYear, cache */) {
        return 12;
      },
      minimumMonthLength(calendarDate) {
        return this.getMonthInfo(calendarDate).length;
      },
      maximumMonthLength(calendarDate) {
        return this.getMonthInfo(calendarDate).length;
      },
      constantEra: 'saka',
      // Indian months always start at the same well-known Gregorian month and
      // day. So this conversion is easy and fast. See
      // https://en.wikipedia.org/wiki/Indian_national_calendar
      months: {
        1: { length: 30, month: 3, day: 22, leap: { length: 31, month: 3, day: 21 } },
        2: { length: 31, month: 4, day: 21 },
        3: { length: 31, month: 5, day: 22 },
        4: { length: 31, month: 6, day: 22 },
        5: { length: 31, month: 7, day: 23 },
        6: { length: 31, month: 8, day: 23 },
        7: { length: 30, month: 9, day: 23 },
        8: { length: 30, month: 10, day: 23 },
        9: { length: 30, month: 11, day: 22 },
        10: { length: 30, month: 12, day: 22 },
        11: { length: 30, month: 1, nextYear: true, day: 21 },
        12: { length: 30, month: 2, nextYear: true, day: 20 }
      },
      getMonthInfo(calendarDate) {
        const { month } = calendarDate;
        let monthInfo = this.months[month];
        if (monthInfo === undefined) throw new RangeError(`Invalid month: ${month}`);
        if (this.inLeapYear(calendarDate) && monthInfo.leap) monthInfo = monthInfo.leap;
        return monthInfo;
      },
      estimateIsoDate(calendarDate) {
        // FYI, this "estimate" is always the exact ISO date, which makes the Indian
        // calendar fast!
        calendarDate = this.adjustCalendarDate(calendarDate);
        const monthInfo = this.getMonthInfo(calendarDate);
        const isoYear = calendarDate.year + 78 + (monthInfo.nextYear ? 1 : 0);
        const isoMonth = monthInfo.month;
        const isoDay = monthInfo.day;
        const isoDate = ES.AddISODate(isoYear, isoMonth, isoDay, 0, 0, 0, calendarDate.day - 1, 'constrain');
        return isoDate;
      },
      // https://bugs.chromium.org/p/v8/issues/detail?id=10529 causes Intl's Indian
      // calendar output to fail for all dates before 0001-01-01 ISO.  For example,
      // in Node 12 0000-01-01 is calculated as 6146/12/-583 instead of 10/11/-79 as
      // expected.
      vulnerableToBceBug:
        new Date('0000-01-01T00:00Z').toLocaleDateString('en-US-u-ca-indian', { timeZone: 'UTC' }) !== '10/11/-79 Saka',
      checkIcuBugs(calendarDate, isoDate) {
        if (this.vulnerableToBceBug && isoDate.year < 1) {
          throw new RangeError(
            `calendar '${this.id}' is broken for ISO dates before 0001-01-01` +
              ' (see https://bugs.chromium.org/p/v8/issues/detail?id=10529)'
          );
        }
      }
    });

    /**
     * This function adds additional metadata that makes it easier to work with
     * eras. Note that it mutates and normalizes the original era objects, which is
     * OK because this is non-observable, internal-only metadata.
     *
     * The result is an array of eras with this shape:
     * ```
     * interface Era {
     *   // name of the era
     *   name: string;
     *
     *   // alternate name of the era used in old versions of ICU data
     *   // format is `era{n}` where n is the zero-based index of the era
     *   // with the oldest era being 0.
     *   genericName: string;
     *
     *   // Signed calendar year where this era begins. Will be
     *   // 1 (or 0 for zero-based eras) for the anchor era assuming that `year`
     *   // numbering starts at the beginning of the anchor era, which is true
     *   // for all ICU calendars except Japanese. If an era starts mid-year
     *   // then a calendar month and day are included. Otherwise
     *   // `{ month: 1, day: 1 }` is assumed.
     *   anchorEpoch:  { year: number } | { year: number, month: number, day: number }
     *
     *   // ISO date of the first day of this era
     *   isoEpoch: { year: number, month: number, day: number}
     *
     *   // If present, then this era counts years backwards like BC
     *   // and this property points to the forward era. This must be
     *   // the last (oldest) era in the array.
     *   reverseOf: Era;
     *
     *   // If true, the era's years are 0-based. If omitted or false,
     *   // then the era's years are 1-based.
     *   hasYearZero: boolean = false;
     * }
     * ```
     * */
    function adjustEras(eras) {
      if (eras.length === 0) {
        throw new RangeError('Invalid era data: eras are required');
      }
      if (eras.length === 1 && eras[0].reverseOf) {
        throw new RangeError('Invalid era data: anchor era cannot count years backwards');
      }
      if (eras.length === 1 && !eras[0].name) {
        throw new RangeError('Invalid era data: at least one named era is required');
      }
      if (eras.filter((e) => e.reverseOf != null).length > 1) {
        throw new RangeError('Invalid era data: only one era can count years backwards');
      }

      // Find the "anchor era" which is the era used for (era-less) `year`. Reversed
      // eras can never be anchors. The era without an `anchorEpoch` property is the
      // anchor.
      let anchorEra;
      eras.forEach((e) => {
        if (e.isAnchor || (!e.anchorEpoch && !e.reverseOf)) {
          if (anchorEra) throw new RangeError('Invalid era data: cannot have multiple anchor eras');
          anchorEra = e;
          e.anchorEpoch = { year: e.hasYearZero ? 0 : 1 };
        } else if (!e.name) {
          throw new RangeError('If era name is blank, it must be the anchor era');
        }
      });

      // If the era name is undefined, then it's an anchor that doesn't interact
      // with eras at all. For example, Japanese `year` is always the same as ISO
      // `year`.  So this "era" is the anchor era but isn't used for era matching.
      // Strip it from the list that's returned.
      eras = eras.filter((e) => e.name);

      eras.forEach((e) => {
        // Some eras are mirror images of another era e.g. B.C. is the reverse of A.D.
        // Replace the string-valued "reverseOf" property with the actual era object
        // that's reversed.
        const { reverseOf } = e;
        if (reverseOf) {
          const reversedEra = eras.find((era) => era.name === reverseOf);
          if (reversedEra === undefined) throw new RangeError(`Invalid era data: unmatched reverseOf era: ${reverseOf}`);
          e.reverseOf = reversedEra;
          e.anchorEpoch = reversedEra.anchorEpoch;
          e.isoEpoch = reversedEra.isoEpoch;
        }
        if (e.anchorEpoch.month === undefined) e.anchorEpoch.month = 1;
        if (e.anchorEpoch.day === undefined) e.anchorEpoch.day = 1;
      });

      // Ensure that the latest epoch is first in the array. This lets us try to
      // match eras in index order, with the last era getting the remaining older
      // years. Any reverse-signed era must be at the end.
      eras.sort((e1, e2) => {
        if (e1.reverseOf) return 1;
        if (e2.reverseOf) return -1;
        return e2.isoEpoch.year - e1.isoEpoch.year;
      });

      // If there's a reversed era, then the one before it must be the era that's
      // being reversed.
      const lastEraReversed = eras[eras.length - 1].reverseOf;
      if (lastEraReversed) {
        if (lastEraReversed !== eras[eras.length - 2]) throw new RangeError('Invalid era data: invalid reverse-sign era');
      }

      // Finally, add a "genericName" property in the format "era{n} where `n` is
      // zero-based index, with the oldest era being zero. This format is used by
      // older versions of ICU data.
      eras.forEach((e, i) => {
        e.genericName = `era${eras.length - 1 - i}`;
      });

      return { eras, anchorEra: anchorEra || eras[0] };
    }

    function isGregorianLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }

    /** Base for all Gregorian-like calendars. */
    const makeHelperGregorian = (id, originalEras) => {
      const { eras, anchorEra } = adjustEras(originalEras);
      return ObjectAssign$3({}, nonIsoHelperBase, {
        id,
        eras,
        anchorEra,
        calendarType: 'solar',
        inLeapYear(calendarDate /*, cache */) {
          const { year } = this.estimateIsoDate(calendarDate);
          return isGregorianLeapYear(year);
        },
        monthsInYear(/* calendarDate */) {
          return 12;
        },
        minimumMonthLength(calendarDate) {
          const { month } = calendarDate;
          if (month === 2) return this.inLeapYear(calendarDate) ? 29 : 28;
          return [4, 6, 9, 11].indexOf(month) >= 0 ? 30 : 31;
        },
        maximumMonthLength(calendarDate) {
          return this.minimumMonthLength(calendarDate);
        },
        /** Fill in missing parts of the (year, era, eraYear) tuple */
        completeEraYear(calendarDate) {
          const checkField = (name, value) => {
            const currentValue = calendarDate[name];
            if (currentValue != null && currentValue != value) {
              throw new RangeError(`Input ${name} ${currentValue} doesn't match calculated value ${value}`);
            }
          };
          const eraFromYear = (year) => {
            let eraYear;
            const adjustedCalendarDate = { ...calendarDate, year };
            const matchingEra = this.eras.find((e, i) => {
              if (i === this.eras.length - 1) {
                if (e.reverseOf) {
                  // This is a reverse-sign era (like BCE) which must be the oldest
                  // era. Count years backwards.
                  if (year > 0) throw new RangeError(`Signed year ${year} is invalid for era ${e.name}`);
                  eraYear = e.anchorEpoch.year - year;
                  return true;
                }
                // last era always gets all "leftover" (older than epoch) years,
                // so no need for a comparison like below.
                eraYear = year - e.anchorEpoch.year + (e.hasYearZero ? 0 : 1);
                return true;
              }
              const comparison = nonIsoHelperBase.compareCalendarDates(adjustedCalendarDate, e.anchorEpoch);
              if (comparison >= 0) {
                eraYear = year - e.anchorEpoch.year + (e.hasYearZero ? 0 : 1);
                return true;
              }
              return false;
            });
            if (!matchingEra) throw new RangeError(`Year ${year} was not matched by any era`);
            return { eraYear, era: matchingEra.name };
          };

          let { year, eraYear, era } = calendarDate;
          if (year != null) {
            ({ eraYear, era } = eraFromYear(year));
            checkField('era', era);
            checkField('eraYear', eraYear);
          } else if (eraYear != null) {
            const matchingEra =
              era === undefined ? undefined : this.eras.find((e) => e.name === era || e.genericName === era);
            if (!matchingEra) throw new RangeError(`Era ${era} (ISO year ${eraYear}) was not matched by any era`);
            if (eraYear < 1 && matchingEra.reverseOf) {
              throw new RangeError(`Years in ${era} era must be positive, not ${year}`);
            }
            if (matchingEra.reverseOf) {
              year = matchingEra.anchorEpoch.year - eraYear;
            } else {
              year = eraYear + matchingEra.anchorEpoch.year - (matchingEra.hasYearZero ? 0 : 1);
            }
            checkField('year', year);
            // We'll accept dates where the month/day is earlier than the start of
            // the era or after its end as long as it's in the same year. If that
            // happens, we'll adjust the era/eraYear pair to be the correct era for
            // the `year`.
            ({ eraYear, era } = eraFromYear(year));
          } else {
            throw new RangeError('Either `year` or `eraYear` and `era` are required');
          }
          return { ...calendarDate, year, eraYear, era };
        },
        adjustCalendarDate(calendarDate, cache, overflow /*, fromLegacyDate = false */) {
          // Because this is not a lunisolar calendar, it's safe to convert monthCode to a number
          const { month, monthCode } = calendarDate;
          if (month === undefined) calendarDate = { ...calendarDate, month: monthCodeNumberPart(monthCode) };
          this.validateCalendarDate(calendarDate);
          calendarDate = this.completeEraYear(calendarDate);
          calendarDate = ES.Call(nonIsoHelperBase.adjustCalendarDate, this, [calendarDate, cache, overflow]);
          return calendarDate;
        },
        estimateIsoDate(calendarDate) {
          calendarDate = this.adjustCalendarDate(calendarDate);
          const { year, month, day } = calendarDate;
          const { anchorEra } = this;
          const isoYearEstimate = year + anchorEra.isoEpoch.year - (anchorEra.hasYearZero ? 0 : 1);
          return ES.RegulateISODate(isoYearEstimate, month, day, 'constrain');
        },
        // Several calendars based on the Gregorian calendar use Julian dates (not
        // proleptic Gregorian dates) before the Julian switchover in Oct 1582. See
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1173158.
        v8IsVulnerableToJulianBug: new Date('+001001-01-01T00:00Z')
          .toLocaleDateString('en-US-u-ca-japanese', { timeZone: 'UTC' })
          .startsWith('12'),
        calendarIsVulnerableToJulianBug: false,
        checkIcuBugs(calendarDate, isoDate) {
          if (this.calendarIsVulnerableToJulianBug && this.v8IsVulnerableToJulianBug) {
            const beforeJulianSwitch = ES.CompareISODate(isoDate.year, isoDate.month, isoDate.day, 1582, 10, 15) < 0;
            if (beforeJulianSwitch) {
              throw new RangeError(
                `calendar '${this.id}' is broken for ISO dates before 1582-10-15` +
                  ' (see https://bugs.chromium.org/p/chromium/issues/detail?id=1173158)'
              );
            }
          }
        }
      });
    };

    const makeHelperOrthodox = (id, originalEras) => {
      const base = makeHelperGregorian(id, originalEras);
      return ObjectAssign$3(base, {
        inLeapYear(calendarDate /*, cache */) {
          // Leap years happen one year before the Julian leap year. Note that this
          // calendar is based on the Julian calendar which has a leap year every 4
          // years, unlike the Gregorian calendar which doesn't have leap years on
          // years divisible by 100 except years divisible by 400.
          //
          // Note that we're assuming that leap years in before-epoch times match
          // how leap years are defined now. This is probably not accurate but I'm
          // not sure how better to do it.
          const { year } = calendarDate;
          return (year + 1) % 4 === 0;
        },
        monthsInYear(/* calendarDate */) {
          return 13;
        },
        minimumMonthLength(calendarDate) {
          const { month } = calendarDate;
          // Ethiopian/Coptic calendars have 12 30-day months and an extra 5-6 day 13th month.
          if (month === 13) return this.inLeapYear(calendarDate) ? 6 : 5;
          return 30;
        },
        maximumMonthLength(calendarDate) {
          return this.minimumMonthLength(calendarDate);
        }
      });
    };

    // `coptic` and `ethiopic` calendars are very similar to `ethioaa` calendar,
    // with the following differences:
    // - Coptic uses BCE-like positive numbers for years before its epoch (the other
    //   two use negative year numbers before epoch)
    // - Coptic has a different epoch date
    // - Ethiopic has an additional second era that starts at the same date as the
    //   zero era of ethioaa.
    const helperEthioaa = makeHelperOrthodox('ethioaa', [{ name: 'era0', isoEpoch: { year: -5492, month: 7, day: 17 } }]);
    const helperCoptic = makeHelperOrthodox('coptic', [
      { name: 'era1', isoEpoch: { year: 284, month: 8, day: 29 } },
      { name: 'era0', reverseOf: 'era1' }
    ]);
    // Anchor is currently the older era to match ethioaa, but should it be the newer era?
    // See https://github.com/tc39/ecma402/issues/534 for discussion.
    const helperEthiopic = makeHelperOrthodox('ethiopic', [
      { name: 'era0', isoEpoch: { year: -5492, month: 7, day: 17 } },
      { name: 'era1', isoEpoch: { year: 8, month: 8, day: 27 }, anchorEpoch: { year: 5501 } }
    ]);

    const helperRoc = ObjectAssign$3(
      {},
      makeHelperGregorian('roc', [
        { name: 'minguo', isoEpoch: { year: 1912, month: 1, day: 1 } },
        { name: 'before-roc', reverseOf: 'minguo' }
      ]),
      {
        calendarIsVulnerableToJulianBug: true
      }
    );

    const helperBuddhist = ObjectAssign$3(
      {},
      makeHelperGregorian('buddhist', [{ name: 'be', hasYearZero: true, isoEpoch: { year: -543, month: 1, day: 1 } }]),
      {
        calendarIsVulnerableToJulianBug: true
      }
    );

    const helperGregory = ObjectAssign$3(
      {},
      makeHelperGregorian('gregory', [
        { name: 'ce', isoEpoch: { year: 1, month: 1, day: 1 } },
        { name: 'bce', reverseOf: 'ce' }
      ]),
      {
        reviseIntlEra(calendarDate /*, isoDate*/) {
          let { era, eraYear } = calendarDate;
          if (era === 'bc') era = 'bce';
          if (era === 'ad') era = 'ce';
          return { era, eraYear };
        }
      }
    );

    const helperJapanese = ObjectAssign$3(
      {},
      // NOTE: Only the 5 modern eras (Meiji and later) are included. For dates
      // before Meiji 1, the `ce` and `bce` eras are used. Challenges with pre-Meiji
      // eras include:
      // - Start/end dates of older eras are not precisely defined, which is
      //   challenging given Temporal's need for precision
      // - Some era dates and/or names are disputed by historians
      // - As historical research proceeds, new eras are discovered and existing era
      //   dates are modified, leading to considerable churn which is not good for
      //   Temporal use.
      //  - The earliest era (in 645 CE) may not end up being the earliest depending
      //    on future historical scholarship
      //  - Before Meiji, Japan used a lunar (or lunisolar?) calendar but AFAIK
      //    that's not reflected in the ICU implementation.
      //
      // For more discussion: https://github.com/tc39/proposal-temporal/issues/526.
      //
      // Here's a full list of CLDR/ICU eras:
      // https://github.com/unicode-org/icu/blob/master/icu4c/source/data/locales/root.txt#L1582-L1818
      // https://github.com/unicode-org/cldr/blob/master/common/supplemental/supplementalData.xml#L4310-L4546
      //
      // NOTE: Japan started using the Gregorian calendar in 6 Meiji, replacing a
      // lunisolar calendar. So the day before January 1 of 6 Meiji (1873) was not
      // December 31, but December 2, of 5 Meiji (1872). The existing Ecma-402
      // Japanese calendar doesn't seem to take this into account, so neither do we:
      // > args = ['en-ca-u-ca-japanese', { era: 'short' }]
      // > new Date('1873-01-01T12:00').toLocaleString(...args)
      // '1 1, 6 Meiji, 12:00:00 PM'
      // > new Date('1872-12-31T12:00').toLocaleString(...args)
      // '12 31, 5 Meiji, 12:00:00 PM'
      makeHelperGregorian('japanese', [
        // The Japanese calendar `year` is just the ISO year, because (unlike other
        // ICU calendars) there's no obvious "default era", we use the ISO year.
        { name: 'reiwa', isoEpoch: { year: 2019, month: 5, day: 1 }, anchorEpoch: { year: 2019, month: 5, day: 1 } },
        { name: 'heisei', isoEpoch: { year: 1989, month: 1, day: 8 }, anchorEpoch: { year: 1989, month: 1, day: 8 } },
        { name: 'showa', isoEpoch: { year: 1926, month: 12, day: 25 }, anchorEpoch: { year: 1926, month: 12, day: 25 } },
        { name: 'taisho', isoEpoch: { year: 1912, month: 7, day: 30 }, anchorEpoch: { year: 1912, month: 7, day: 30 } },
        { name: 'meiji', isoEpoch: { year: 1868, month: 9, day: 8 }, anchorEpoch: { year: 1868, month: 9, day: 8 } },
        { name: 'ce', isoEpoch: { year: 1, month: 1, day: 1 } },
        { name: 'bce', reverseOf: 'ce' }
      ]),
      {
        // The last 3 Japanese eras confusingly return only one character in the
        // default "short" era, so need to use the long format.
        eraLength: 'long',
        calendarIsVulnerableToJulianBug: true,
        reviseIntlEra(calendarDate, isoDate) {
          const { era, eraYear } = calendarDate;
          const { year: isoYear } = isoDate;
          if (this.eras.find((e) => e.name === era)) return { era, eraYear };
          return isoYear < 1 ? { era: 'bce', eraYear: 1 - isoYear } : { era: 'ce', eraYear: isoYear };
        }
      }
    );

    const helperChinese = ObjectAssign$3({}, nonIsoHelperBase, {
      id: 'chinese',
      calendarType: 'lunisolar',
      inLeapYear(calendarDate, cache) {
        const months = this.getMonthList(calendarDate.year, cache);
        return ObjectEntries$1(months).length === 13;
      },
      monthsInYear(calendarDate, cache) {
        return this.inLeapYear(calendarDate, cache) ? 13 : 12;
      },
      minimumMonthLength: (/* calendarDate */) => 29,
      maximumMonthLength: (/* calendarDate */) => 30,
      getMonthList(calendarYear, cache) {
        if (calendarYear === undefined) {
          throw new TypeError('Missing year');
        }
        const key = JSON.stringify({ func: 'getMonthList', calendarYear, id: this.id });
        const cached = cache.get(key);
        if (cached) return cached;
        const dateTimeFormat = this.getFormatter();
        const getCalendarDate = (isoYear, daysPastFeb1) => {
          const isoStringFeb1 = toUtcIsoDateString({ isoYear, isoMonth: 2, isoDay: 1 });
          const legacyDate = new Date(isoStringFeb1);
          // Now add the requested number of days, which may wrap to the next month.
          legacyDate.setUTCDate(daysPastFeb1 + 1);
          const newYearGuess = dateTimeFormat.formatToParts(legacyDate);
          const calendarMonthString = newYearGuess.find((tv) => tv.type === 'month').value;
          const calendarDay = +newYearGuess.find((tv) => tv.type === 'day').value;
          let calendarYearToVerify = newYearGuess.find((tv) => tv.type === 'relatedYear');
          if (calendarYearToVerify !== undefined) {
            calendarYearToVerify = +calendarYearToVerify.value;
          } else {
            // Node 12 has outdated ICU data that lacks the `relatedYear` field in the
            // output of Intl.DateTimeFormat.formatToParts.
            throw new RangeError(
              `Intl.DateTimeFormat.formatToParts lacks relatedYear in ${this.id} calendar. Try Node 14+ or modern browsers.`
            );
          }
          return { calendarMonthString, calendarDay, calendarYearToVerify };
        };

        // First, find a date close to Chinese New Year. Feb 17 will either be in
        // the first month or near the end of the last month of the previous year.
        let isoDaysDelta = 17;
        let { calendarMonthString, calendarDay, calendarYearToVerify } = getCalendarDate(calendarYear, isoDaysDelta);

        // If we didn't guess the first month correctly, add (almost in some months)
        // a lunar month
        if (calendarMonthString !== '1') {
          isoDaysDelta += 29;
          ({ calendarMonthString, calendarDay } = getCalendarDate(calendarYear, isoDaysDelta));
        }

        // Now back up to near the start of the first month, but not too near that
        // off-by-one issues matter.
        isoDaysDelta -= calendarDay - 5;
        const result = {};
        let monthIndex = 1;
        let oldCalendarDay;
        let oldMonthString;
        let done = false;
        do {
          ({ calendarMonthString, calendarDay, calendarYearToVerify } = getCalendarDate(calendarYear, isoDaysDelta));
          if (oldCalendarDay) {
            result[oldMonthString].daysInMonth = oldCalendarDay + 30 - calendarDay;
          }
          if (calendarYearToVerify !== calendarYear) {
            done = true;
          } else {
            result[calendarMonthString] = { monthIndex: monthIndex++ };
            // Move to the next month. Because months are sometimes 29 days, the day of the
            // calendar month will move forward slowly but not enough to flip over to a new
            // month before the loop ends at 12-13 months.
            isoDaysDelta += 30;
          }
          oldCalendarDay = calendarDay;
          oldMonthString = calendarMonthString;
        } while (!done);
        result[oldMonthString].daysInMonth = oldCalendarDay + 30 - calendarDay;

        cache.set(key, result);
        return result;
      },
      estimateIsoDate(calendarDate) {
        const { year, month } = calendarDate;
        return { year, month: month >= 12 ? 12 : month + 1, day: 1 };
      },
      adjustCalendarDate(calendarDate, cache, overflow = 'constrain', fromLegacyDate = false) {
        let { year, month, monthExtra, day, monthCode, eraYear } = calendarDate;
        if (fromLegacyDate) {
          // Legacy Date output returns a string that's an integer with an optional
          // "bis" suffix used only by the Chinese/Dangi calendar to indicate a leap
          // month. Below we'll normalize the output.
          year = eraYear;
          if (monthExtra && monthExtra !== 'bis') throw new RangeError(`Unexpected leap month suffix: ${monthExtra}`);
          const monthCode = buildMonthCode(month, monthExtra !== undefined);
          const monthString = `${month}${monthExtra || ''}`;
          const months = this.getMonthList(year, cache);
          const monthInfo = months[monthString];
          if (monthInfo === undefined) throw new RangeError(`Unmatched month ${monthString} in Chinese year ${year}`);
          month = monthInfo.monthIndex;
          return { year, month, day, era: undefined, eraYear, monthCode };
        } else {
          // When called without input coming from legacy Date output,
          // simply ensure that all fields are present.
          this.validateCalendarDate(calendarDate);
          if (year === undefined) year = eraYear;
          if (eraYear === undefined) eraYear = year;
          if (month === undefined) {
            const months = this.getMonthList(year, cache);
            let numberPart = monthCode.replace('L', 'bis').slice(1);
            if (numberPart[0] === '0') numberPart = numberPart.slice(1);
            let monthInfo = months[numberPart];
            month = monthInfo && monthInfo.monthIndex;
            // If this leap month isn't present in this year, constrain down to the last day of the previous month.
            if (
              month === undefined &&
              monthCode.endsWith('L') &&
              !['M01L', 'M12L', 'M13L'].includes(monthCode) &&
              overflow === 'constrain'
            ) {
              let withoutML = monthCode.slice(1, -1);
              if (withoutML[0] === '0') withoutML = withoutML.slice(1);
              monthInfo = months[withoutML];
              if (monthInfo) {
                ({ daysInMonth: day, monthIndex: month } = monthInfo);
                monthCode = buildMonthCode(withoutML);
              }
            }
            if (month === undefined) {
              throw new RangeError(`Unmatched month ${monthCode} in Chinese year ${year}`);
            }
          } else if (monthCode === undefined) {
            const months = this.getMonthList(year, cache);
            const monthEntries = ObjectEntries$1(months);
            const largestMonth = monthEntries.length;
            if (overflow === 'reject') {
              ES.RejectToRange(month, 1, largestMonth);
              ES.RejectToRange(day, 1, this.maximumMonthLength());
            } else {
              month = ES.ConstrainToRange(month, 1, largestMonth);
              day = ES.ConstrainToRange(day, 1, this.maximumMonthLength());
            }
            const matchingMonthEntry = monthEntries.find(([, v]) => v.monthIndex === month);
            if (matchingMonthEntry === undefined) {
              throw new RangeError(`Invalid month ${month} in Chinese year ${year}`);
            }
            monthCode = buildMonthCode(
              matchingMonthEntry[0].replace('bis', ''),
              matchingMonthEntry[0].indexOf('bis') !== -1
            );
          } else {
            // Both month and monthCode are present. Make sure they don't conflict.
            const months = this.getMonthList(year, cache);
            let numberPart = monthCode.replace('L', 'bis').slice(1);
            if (numberPart[0] === '0') numberPart = numberPart.slice(1);
            let monthInfo = months[numberPart];
            if (!monthInfo) throw new RangeError(`Unmatched monthCode ${monthCode} in Chinese year ${year}`);
            if (month !== monthInfo.monthIndex) {
              throw new RangeError(`monthCode ${monthCode} doesn't correspond to month ${month} in Chinese year ${year}`);
            }
          }
          return { ...calendarDate, year, eraYear, month, monthCode, day };
        }
      },
      // All built-in calendars except Chinese/Dangi and Hebrew use an era
      hasEra: false
    });

    // Dangi (Korean) calendar has same implementation as Chinese
    const helperDangi = ObjectAssign$3({}, { ...helperChinese, id: 'dangi' });

    /**
     * Common implementation of all non-ISO calendars.
     * Per-calendar id and logic live in `id` and `helper` properties attached later.
     * This split allowed an easy separation between code that was similar between
     * ISO and non-ISO implementations vs. code that was very different.
     */
    const nonIsoGeneralImpl = {
      dateFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        const cache = new OneObjectCache();
        // Intentionally alphabetical
        fields = ES.PrepareTemporalFields(fields, [
          ['day'],
          ['era', undefined],
          ['eraYear', undefined],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ]);
        const { year, month, day } = this.helper.calendarToIsoDate(fields, overflow, cache);
        const result = ES.CreateTemporalDate(year, month, day, calendar);
        cache.setObject(result);
        return result;
      },
      yearMonthFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        const cache = new OneObjectCache();
        // Intentionally alphabetical
        fields = ES.PrepareTemporalFields(fields, [
          ['era', undefined],
          ['eraYear', undefined],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ]);
        const { year, month, day } = this.helper.calendarToIsoDate({ ...fields, day: 1 }, overflow, cache);
        const result = ES.CreateTemporalYearMonth(year, month, calendar, /* referenceISODay = */ day);
        cache.setObject(result);
        return result;
      },
      monthDayFromFields(fields, options, calendar) {
        const overflow = ES.ToTemporalOverflow(options);
        // All built-in calendars require `day`, but some allow other fields to be
        // substituted for `month`. And for lunisolar calendars, either `monthCode`
        // or `year` must be provided because `month` is ambiguous without a year or
        // a code.
        const cache = new OneObjectCache();
        fields = ES.PrepareTemporalFields(fields, [
          ['day'],
          ['era', undefined],
          ['eraYear', undefined],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ]);
        const { year, month, day } = this.helper.monthDayFromFields(fields, overflow, cache);
        // `year` is a reference year where this month/day exists in this calendar
        const result = ES.CreateTemporalMonthDay(month, day, calendar, /* referenceISOYear = */ year);
        cache.setObject(result);
        return result;
      },
      fields(fields) {
        if (fields.includes('year')) fields = [...fields, 'era', 'eraYear'];
        return fields;
      },
      mergeFields(fields, additionalFields) {
        const fieldsCopy = { ...fields };
        const additionalFieldsCopy = { ...additionalFields };
        // era and eraYear are intentionally unused
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { month, monthCode, year, era, eraYear, ...original } = fieldsCopy;
        const {
          month: newMonth,
          monthCode: newMonthCode,
          year: newYear,
          era: newEra,
          eraYear: newEraYear
        } = additionalFieldsCopy;
        if (newMonth === undefined && newMonthCode === undefined) {
          original.month = month;
          original.monthCode = monthCode;
        }
        if (newYear === undefined && newEra === undefined && newEraYear === undefined) {
          // Only `year` is needed. We don't set era and eraYear because it's
          // possible to create a conflict for eras that start or end mid-year. See
          // https://github.com/tc39/proposal-temporal/issues/1784.
          original.year = year;
        }
        return { ...original, ...additionalFieldsCopy };
      },
      dateAdd(date, years, months, weeks, days, overflow, calendar) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        const added = this.helper.addCalendar(calendarDate, { years, months, weeks, days }, overflow, cache);
        const isoAdded = this.helper.calendarToIsoDate(added, 'constrain', cache);
        const { year, month, day } = isoAdded;
        const newTemporalObject = ES.CreateTemporalDate(year, month, day, calendar);
        // The new object's cache starts with the cache of the old object
        const newCache = new OneObjectCache(cache);
        newCache.setObject(newTemporalObject);
        return newTemporalObject;
      },
      dateUntil(one, two, largestUnit) {
        const cacheOne = OneObjectCache.getCacheForObject(one);
        const cacheTwo = OneObjectCache.getCacheForObject(two);
        const calendarOne = this.helper.temporalToCalendarDate(one, cacheOne);
        const calendarTwo = this.helper.temporalToCalendarDate(two, cacheTwo);
        const result = this.helper.untilCalendar(calendarOne, calendarTwo, largestUnit, cacheOne);
        return result;
      },
      year(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.year;
      },
      month(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.month;
      },
      day(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.day;
      },
      era(date) {
        if (!this.helper.hasEra) return undefined;
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.era;
      },
      eraYear(date) {
        if (!this.helper.hasEra) return undefined;
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.eraYear;
      },
      monthCode(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        return calendarDate.monthCode;
      },
      dayOfWeek(date) {
        return impl['iso8601'].dayOfWeek(date);
      },
      dayOfYear(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.isoToCalendarDate(date, cache);
        const startOfYear = this.helper.startOfCalendarYear(calendarDate);
        const diffDays = this.helper.calendarDaysUntil(startOfYear, calendarDate, cache);
        return diffDays + 1;
      },
      weekOfYear(date) {
        return impl['iso8601'].weekOfYear(date);
      },
      daysInWeek(date) {
        return impl['iso8601'].daysInWeek(date);
      },
      daysInMonth(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);

        // Easy case: if the helper knows the length without any heavy calculation.
        const max = this.helper.maximumMonthLength(calendarDate);
        const min = this.helper.minimumMonthLength(calendarDate);
        if (max === min) return max;

        // The harder case is where months vary every year, e.g. islamic calendars.
        // Find the answer by calculating the difference in days between the first
        // day of the current month and the first day of the next month.
        const startOfMonthCalendar = this.helper.startOfCalendarMonth(calendarDate);
        const startOfNextMonthCalendar = this.helper.addMonthsCalendar(startOfMonthCalendar, 1, 'constrain', cache);
        const result = this.helper.calendarDaysUntil(startOfMonthCalendar, startOfNextMonthCalendar, cache);
        return result;
      },
      daysInYear(date) {
        if (!HasSlot(date, ISO_YEAR)) date = ES.ToTemporalDate(date);
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        const startOfYearCalendar = this.helper.startOfCalendarYear(calendarDate);
        const startOfNextYearCalendar = this.helper.addCalendar(startOfYearCalendar, { years: 1 }, 'constrain', cache);
        const result = this.helper.calendarDaysUntil(startOfYearCalendar, startOfNextYearCalendar, cache);
        return result;
      },
      monthsInYear(date) {
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        const result = this.helper.monthsInYear(calendarDate, cache);
        return result;
      },
      inLeapYear(date) {
        if (!HasSlot(date, ISO_YEAR)) date = ES.ToTemporalDate(date);
        const cache = OneObjectCache.getCacheForObject(date);
        const calendarDate = this.helper.temporalToCalendarDate(date, cache);
        const result = this.helper.inLeapYear(calendarDate, cache);
        return result;
      }
    };

    impl['hebrew'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperHebrew });
    impl['islamic'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperIslamic });
    ['islamic-umalqura', 'islamic-tbla', 'islamic-civil', 'islamic-rgsa', 'islamicc'].forEach((id) => {
      impl[id] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: { ...helperIslamic, id } });
    });
    impl['persian'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperPersian });
    impl['ethiopic'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperEthiopic });
    impl['ethioaa'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperEthioaa });
    impl['coptic'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperCoptic });
    impl['chinese'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperChinese });
    impl['dangi'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperDangi });
    impl['roc'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperRoc });
    impl['indian'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperIndian });
    impl['buddhist'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperBuddhist });
    impl['japanese'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperJapanese });
    impl['gregory'] = ObjectAssign$3({}, nonIsoGeneralImpl, { helper: helperGregory });

    const BUILTIN_CALENDAR_IDS = Object.keys(impl);

    function IsBuiltinCalendar(id) {
      return ArrayIncludes.call(BUILTIN_CALENDAR_IDS, id);
    }

    const tzComponent = /\.[-A-Za-z_]|\.\.[-A-Za-z._]{1,12}|\.[-A-Za-z_][-A-Za-z._]{0,12}|[A-Za-z_][-A-Za-z._]{0,13}/;
    const offsetNoCapture = /(?:[+\u2212-][0-2][0-9](?::?[0-5][0-9](?::?[0-5][0-9](?:[.,]\d{1,9})?)?)?)/;
    const timeZoneID = new RegExp(
      `(?:(?:${tzComponent.source})(?:\\/(?:${tzComponent.source}))*|Etc/GMT[-+]\\d{1,2}|${offsetNoCapture.source})`
    );

    const calComponent = /[A-Za-z0-9]{3,8}/;
    const calendarID = new RegExp(`(?:${calComponent.source}(?:-${calComponent.source})*)`);

    const yearpart = /(?:[+\u2212-]\d{6}|\d{4})/;
    const monthpart = /(?:0[1-9]|1[0-2])/;
    const daypart = /(?:0[1-9]|[12]\d|3[01])/;
    const datesplit = new RegExp(
      `(${yearpart.source})(?:-(${monthpart.source})-(${daypart.source})|(${monthpart.source})(${daypart.source}))`
    );
    const timesplit = /(\d{2})(?::(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?|(\d{2})(?:(\d{2})(?:[.,](\d{1,9}))?)?)?/;
    const offset = /([+\u2212-])([01][0-9]|2[0-3])(?::?([0-5][0-9])(?::?([0-5][0-9])(?:[.,](\d{1,9}))?)?)?/;
    const zonesplit = new RegExp(`(?:([zZ])|(?:${offset.source})?)(?:\\[(${timeZoneID.source})\\])?`);
    const calendar = new RegExp(`\\[u-ca=(${calendarID.source})\\]`);

    const instant$1 = new RegExp(
      `^${datesplit.source}(?:(?:T|\\s+)${timesplit.source})?${zonesplit.source}(?:${calendar.source})?$`,
      'i'
    );
    const datetime = new RegExp(
      `^${datesplit.source}(?:(?:T|\\s+)${timesplit.source})?(?:${zonesplit.source})?(?:${calendar.source})?$`,
      'i'
    );

    const time = new RegExp(`^${timesplit.source}(?:${zonesplit.source})?(?:${calendar.source})?$`, 'i');

    // The short forms of YearMonth and MonthDay are only for the ISO calendar.
    // Non-ISO calendar YearMonth and MonthDay have to parse as a Temporal.PlainDate,
    // with the reference fields.
    // YYYYMM forbidden by ISO 8601, but since it is not ambiguous with anything
    // else we could parse in a YearMonth context, we allow it
    const yearmonth = new RegExp(`^(${yearpart.source})-?(${monthpart.source})$`);
    const monthday = new RegExp(`^(?:--)?(${monthpart.source})-?(${daypart.source})$`);

    const fraction = /(\d+)(?:[.,](\d{1,9}))?/;

    const durationDate = /(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?/;
    const durationTime = new RegExp(`(?:${fraction.source}H)?(?:${fraction.source}M)?(?:${fraction.source}S)?`);
    const duration = new RegExp(`^([+\u2212-])?P${durationDate.source}(?:T(?!$)${durationTime.source})?$`, 'i');

    /* global false */

    const ArrayPrototypePush$1 = Array.prototype.push;
    const IntlDateTimeFormat$1 = globalThis.Intl.DateTimeFormat;
    const MathMin = Math.min;
    const MathMax = Math.max;
    const MathAbs = Math.abs;
    const MathFloor = Math.floor;
    const MathSign = Math.sign;
    const MathTrunc = Math.trunc;
    const NumberIsNaN = Number.isNaN;
    const NumberIsFinite = Number.isFinite;
    const NumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
    const ObjectAssign$2 = Object.assign;
    const ObjectCreate$7 = Object.create;
    const ObjectIs = Object.is;
    const ObjectEntries = Object.entries;

    const DAY_SECONDS = 86400;
    const DAY_NANOS = bigInt(DAY_SECONDS).multiply(1e9);
    const NS_MIN = bigInt(-DAY_SECONDS).multiply(1e17);
    const NS_MAX = bigInt(DAY_SECONDS).multiply(1e17);
    const YEAR_MIN = -271821;
    const YEAR_MAX = 275760;
    const BEFORE_FIRST_DST = bigInt(-388152).multiply(1e13); // 1847-01-01T00:00:00Z

    const ToIntegerThrowOnInfinity = (value) => {
      const integer = ES.ToInteger(value);
      if (!NumberIsFinite(integer)) {
        throw new RangeError('infinity is out of range');
      }
      return integer;
    };

    const ToPositiveInteger = (value, property) => {
      value = ToInteger$2(value);
      if (!NumberIsFinite(value)) {
        throw new RangeError('infinity is out of range');
      }
      if (value < 1) {
        if (property !== undefined) {
          throw new RangeError(`property '${property}' cannot be a a number less than one`);
        }
        throw new RangeError('Cannot convert a number less than one to a positive integer');
      }
      return value;
    };
    const ToIntegerWithoutRounding = (value) => {
      value = ES.ToNumber(value);
      if (NumberIsNaN(value)) return 0;
      if (!NumberIsFinite(value)) {
        throw new RangeError('infinity is out of range');
      }
      if (!ES.IsInteger(value)) {
        throw new RangeError(`unsupported fractional value ${value}`);
      }
      return ES.ToInteger(value); // ℝ(value) in spec text; converts -0 to 0
    };

    const BUILTIN_CASTS = new Map([
      ['year', ToIntegerThrowOnInfinity],
      ['month', ToPositiveInteger],
      ['monthCode', ToString$1],
      ['day', ToPositiveInteger],
      ['hour', ToIntegerThrowOnInfinity],
      ['minute', ToIntegerThrowOnInfinity],
      ['second', ToIntegerThrowOnInfinity],
      ['millisecond', ToIntegerThrowOnInfinity],
      ['microsecond', ToIntegerThrowOnInfinity],
      ['nanosecond', ToIntegerThrowOnInfinity],
      ['years', ToIntegerWithoutRounding],
      ['months', ToIntegerWithoutRounding],
      ['weeks', ToIntegerWithoutRounding],
      ['days', ToIntegerWithoutRounding],
      ['hours', ToIntegerWithoutRounding],
      ['minutes', ToIntegerWithoutRounding],
      ['seconds', ToIntegerWithoutRounding],
      ['milliseconds', ToIntegerWithoutRounding],
      ['microseconds', ToIntegerWithoutRounding],
      ['nanoseconds', ToIntegerWithoutRounding],
      ['era', ToString$1],
      ['eraYear', ToInteger$2],
      ['offset', ToString$1]
    ]);

    const ALLOWED_UNITS = [
      'year',
      'month',
      'week',
      'day',
      'hour',
      'minute',
      'second',
      'millisecond',
      'microsecond',
      'nanosecond'
    ];
    const SINGULAR_PLURAL_UNITS = [
      ['years', 'year'],
      ['months', 'month'],
      ['weeks', 'week'],
      ['days', 'day'],
      ['hours', 'hour'],
      ['minutes', 'minute'],
      ['seconds', 'second'],
      ['milliseconds', 'millisecond'],
      ['microseconds', 'microsecond'],
      ['nanoseconds', 'nanosecond']
    ];

    const ES2020 = {
      Call: Call$1,
      GetMethod: GetMethod$2,
      HasOwnProperty: HasOwnProperty$1,
      IsInteger: IsInteger$1,
      ToInteger: ToInteger$2,
      ToLength: ToLength$1,
      ToNumber: ToNumber$2,
      ToPrimitive: ToPrimitive$2,
      ToString: ToString$1,
      Type: Type$2
    };

    const IntlDateTimeFormatEnUsCache = new Map();

    function getIntlDateTimeFormatEnUsForTimeZone(timeZoneIdentifier) {
      let instance = IntlDateTimeFormatEnUsCache.get(timeZoneIdentifier);
      if (instance === undefined) {
        instance = new IntlDateTimeFormat$1('en-us', {
          timeZone: String(timeZoneIdentifier),
          hour12: false,
          era: 'short',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
        IntlDateTimeFormatEnUsCache.set(timeZoneIdentifier, instance);
      }
      return instance;
    }

    const ES = ObjectAssign$2({}, ES2020, {
      ToPositiveInteger: ToPositiveInteger,
      ToIntegerThrowOnInfinity,
      ToIntegerWithoutRounding,
      IsTemporalInstant: (item) => HasSlot(item, EPOCHNANOSECONDS) && !HasSlot(item, TIME_ZONE, CALENDAR),
      IsTemporalTimeZone: (item) => HasSlot(item, TIMEZONE_ID),
      IsTemporalCalendar: (item) => HasSlot(item, CALENDAR_ID),
      IsTemporalDuration: (item) =>
        HasSlot(item, YEARS, MONTHS, DAYS, HOURS, MINUTES, SECONDS, MILLISECONDS, MICROSECONDS, NANOSECONDS),
      IsTemporalDate: (item) => HasSlot(item, DATE_BRAND),
      IsTemporalTime: (item) =>
        HasSlot(item, ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND) &&
        !HasSlot(item, ISO_YEAR, ISO_MONTH, ISO_DAY),
      IsTemporalDateTime: (item) =>
        HasSlot(
          item,
          ISO_YEAR,
          ISO_MONTH,
          ISO_DAY,
          ISO_HOUR,
          ISO_MINUTE,
          ISO_SECOND,
          ISO_MILLISECOND,
          ISO_MICROSECOND,
          ISO_NANOSECOND
        ),
      IsTemporalYearMonth: (item) => HasSlot(item, YEAR_MONTH_BRAND),
      IsTemporalMonthDay: (item) => HasSlot(item, MONTH_DAY_BRAND),
      IsTemporalZonedDateTime: (item) => HasSlot(item, EPOCHNANOSECONDS, TIME_ZONE, CALENDAR),
      RejectObjectWithCalendarOrTimeZone: (item) => {
        if (HasSlot(item, CALENDAR) || HasSlot(item, TIME_ZONE)) {
          throw new TypeError('with() does not support a calendar or timeZone property');
        }
        if (item.calendar !== undefined) {
          throw new TypeError('with() does not support a calendar property');
        }
        if (item.timeZone !== undefined) {
          throw new TypeError('with() does not support a timeZone property');
        }
      },

      ParseTemporalTimeZone: (stringIdent) => {
        let { ianaName, offset, z } = ES.ParseTemporalTimeZoneString(stringIdent);
        if (ianaName) return ianaName;
        if (z) return 'UTC';
        return offset;
      },
      FormatCalendarAnnotation: (id, showCalendar) => {
        if (showCalendar === 'never') return '';
        if (showCalendar === 'auto' && id === 'iso8601') return '';
        return `[u-ca=${id}]`;
      },
      ParseISODateTime: (isoString, { zoneRequired }) => {
        const regex = zoneRequired ? instant$1 : datetime;
        const match = regex.exec(isoString);
        if (!match) throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
        let yearString = match[1];
        if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
        const year = ES.ToInteger(yearString);
        const month = ES.ToInteger(match[2] || match[4]);
        const day = ES.ToInteger(match[3] || match[5]);
        const hour = ES.ToInteger(match[6]);
        const minute = ES.ToInteger(match[7] || match[10]);
        let second = ES.ToInteger(match[8] || match[11]);
        if (second === 60) second = 59;
        const fraction = (match[9] || match[12]) + '000000000';
        const millisecond = ES.ToInteger(fraction.slice(0, 3));
        const microsecond = ES.ToInteger(fraction.slice(3, 6));
        const nanosecond = ES.ToInteger(fraction.slice(6, 9));
        let offset;
        let z = false;
        if (match[13]) {
          offset = undefined;
          z = true;
        } else if (match[14] && match[15]) {
          const offsetSign = match[14] === '-' || match[14] === '\u2212' ? '-' : '+';
          const offsetHours = match[15] || '00';
          const offsetMinutes = match[16] || '00';
          const offsetSeconds = match[17] || '00';
          let offsetFraction = match[18] || '0';
          offset = `${offsetSign}${offsetHours}:${offsetMinutes}`;
          if (+offsetFraction) {
            while (offsetFraction.endsWith('0')) offsetFraction = offsetFraction.slice(0, -1);
            offset += `:${offsetSeconds}.${offsetFraction}`;
          } else if (+offsetSeconds) {
            offset += `:${offsetSeconds}`;
          }
          if (offset === '-00:00') offset = '+00:00';
        }
        let ianaName = match[19];
        if (ianaName) {
          try {
            // Canonicalize name if it is an IANA link name or is capitalized wrong
            ianaName = ES.GetCanonicalTimeZoneIdentifier(ianaName).toString();
          } catch {
            // Not an IANA name, may be a custom ID, pass through unchanged
          }
        }
        const calendar = match[20];
        return {
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          ianaName,
          offset,
          z,
          calendar
        };
      },
      ParseTemporalInstantString: (isoString) => {
        return ES.ParseISODateTime(isoString, { zoneRequired: true });
      },
      ParseTemporalZonedDateTimeString: (isoString) => {
        return ES.ParseISODateTime(isoString, { zoneRequired: true });
      },
      ParseTemporalDateTimeString: (isoString) => {
        return ES.ParseISODateTime(isoString, { zoneRequired: false });
      },
      ParseTemporalDateString: (isoString) => {
        return ES.ParseISODateTime(isoString, { zoneRequired: false });
      },
      ParseTemporalTimeString: (isoString) => {
        const match = time.exec(isoString);
        let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
        if (match) {
          hour = ES.ToInteger(match[1]);
          minute = ES.ToInteger(match[2] || match[5]);
          second = ES.ToInteger(match[3] || match[6]);
          if (second === 60) second = 59;
          const fraction = (match[4] || match[7]) + '000000000';
          millisecond = ES.ToInteger(fraction.slice(0, 3));
          microsecond = ES.ToInteger(fraction.slice(3, 6));
          nanosecond = ES.ToInteger(fraction.slice(6, 9));
          calendar = match[15];
        } else {
          let z;
          ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar, z } = ES.ParseISODateTime(isoString, {
            zoneRequired: false
          }));
          if (z) throw new RangeError('Z designator not supported for PlainTime');
        }
        return { hour, minute, second, millisecond, microsecond, nanosecond, calendar };
      },
      ParseTemporalYearMonthString: (isoString) => {
        const match = yearmonth.exec(isoString);
        let year, month, calendar, referenceISODay;
        if (match) {
          let yearString = match[1];
          if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
          year = ES.ToInteger(yearString);
          month = ES.ToInteger(match[2]);
          calendar = match[3];
        } else {
          let z;
          ({ year, month, calendar, day: referenceISODay, z } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
          if (z) throw new RangeError('Z designator not supported for PlainYearMonth');
        }
        return { year, month, calendar, referenceISODay };
      },
      ParseTemporalMonthDayString: (isoString) => {
        const match = monthday.exec(isoString);
        let month, day, calendar, referenceISOYear;
        if (match) {
          month = ES.ToInteger(match[1]);
          day = ES.ToInteger(match[2]);
        } else {
          let z;
          ({ month, day, calendar, year: referenceISOYear, z } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
          if (z) throw new RangeError('Z designator not supported for PlainMonthDay');
        }
        return { month, day, calendar, referenceISOYear };
      },
      ParseTemporalTimeZoneString: (stringIdent) => {
        try {
          let canonicalIdent = ES.GetCanonicalTimeZoneIdentifier(stringIdent);
          if (canonicalIdent) {
            canonicalIdent = canonicalIdent.toString();
            if (ES.ParseOffsetString(canonicalIdent) !== null) return { offset: canonicalIdent };
            return { ianaName: canonicalIdent };
          }
        } catch {
          // fall through
        }
        try {
          // Try parsing ISO string instead
          return ES.ParseISODateTime(stringIdent, { zoneRequired: true });
        } catch {
          throw new RangeError(`Invalid time zone: ${stringIdent}`);
        }
      },
      ParseTemporalDurationString: (isoString) => {
        const match = duration.exec(isoString);
        if (!match) throw new RangeError(`invalid duration: ${isoString}`);
        if (match.slice(2).every((element) => element === undefined)) {
          throw new RangeError(`invalid duration: ${isoString}`);
        }
        const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : 1;
        const years = ES.ToInteger(match[2]) * sign;
        const months = ES.ToInteger(match[3]) * sign;
        const weeks = ES.ToInteger(match[4]) * sign;
        const days = ES.ToInteger(match[5]) * sign;
        const hours = ES.ToInteger(match[6]) * sign;
        let fHours = match[7];
        let minutes = ES.ToInteger(match[8]) * sign;
        let fMinutes = match[9];
        let seconds = ES.ToInteger(match[10]) * sign;
        let fSeconds = match[11] + '000000000';
        let milliseconds = ES.ToInteger(fSeconds.slice(0, 3)) * sign;
        let microseconds = ES.ToInteger(fSeconds.slice(3, 6)) * sign;
        let nanoseconds = ES.ToInteger(fSeconds.slice(6, 9)) * sign;

        fHours = fHours ? (sign * ES.ToInteger(fHours)) / 10 ** fHours.length : 0;
        fMinutes = fMinutes ? (sign * ES.ToInteger(fMinutes)) / 10 ** fMinutes.length : 0;

        ({ minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DurationHandleFractions(
          fHours,
          minutes,
          fMinutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        ));
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      ParseTemporalInstant: (isoString) => {
        const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, offset, z } =
          ES.ParseTemporalInstantString(isoString);

        const epochNs = ES.GetEpochFromISOParts(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        );
        if (epochNs === null) throw new RangeError('DateTime outside of supported range');
        if (!z && !offset) throw new RangeError('Temporal.Instant requires a time zone offset');
        const offsetNs = z ? 0 : ES.ParseOffsetString(offset);
        return epochNs.subtract(offsetNs);
      },
      RegulateISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
        switch (overflow) {
          case 'reject':
            ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
            break;
          case 'constrain':
            ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainISODateTime(
              year,
              month,
              day,
              hour,
              minute,
              second,
              millisecond,
              microsecond,
              nanosecond
            ));
            break;
        }
        return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      RegulateISODate: (year, month, day, overflow) => {
        switch (overflow) {
          case 'reject':
            ES.RejectISODate(year, month, day);
            break;
          case 'constrain':
            ({ year, month, day } = ES.ConstrainISODate(year, month, day));
            break;
        }
        return { year, month, day };
      },
      RegulateTime: (hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
        switch (overflow) {
          case 'reject':
            ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
            break;
          case 'constrain':
            ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
              hour,
              minute,
              second,
              millisecond,
              microsecond,
              nanosecond
            ));
            break;
        }
        return { hour, minute, second, millisecond, microsecond, nanosecond };
      },
      RegulateISOYearMonth: (year, month, overflow) => {
        const referenceISODay = 1;
        switch (overflow) {
          case 'reject':
            ES.RejectISODate(year, month, referenceISODay);
            break;
          case 'constrain':
            ({ year, month } = ES.ConstrainISODate(year, month));
            break;
        }
        return { year, month };
      },
      DurationHandleFractions: (fHours, minutes, fMinutes, seconds, milliseconds, microseconds, nanoseconds) => {
        if (fHours !== 0) {
          [minutes, fMinutes, seconds, milliseconds, microseconds, nanoseconds].forEach((val) => {
            if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
          });
          let mins = fHours * 60;
          minutes = MathTrunc(mins);
          fMinutes = mins % 1;
        }

        if (fMinutes !== 0) {
          [seconds, milliseconds, microseconds, nanoseconds].forEach((val) => {
            if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
          });
          let secs = fMinutes * 60;
          seconds = MathTrunc(secs);
          const fSeconds = secs % 1;

          if (fSeconds !== 0) {
            let mils = fSeconds * 1000;
            milliseconds = MathTrunc(mils);
            const fMilliseconds = mils % 1;

            if (fMilliseconds !== 0) {
              let mics = fMilliseconds * 1000;
              microseconds = MathTrunc(mics);
              const fMicroseconds = mics % 1;

              if (fMicroseconds !== 0) {
                let nans = fMicroseconds * 1000;
                nanoseconds = MathTrunc(nans);
              }
            }
          }
        }

        return { minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      ToTemporalDurationRecord: (item) => {
        if (ES.IsTemporalDuration(item)) {
          return {
            years: GetSlot(item, YEARS),
            months: GetSlot(item, MONTHS),
            weeks: GetSlot(item, WEEKS),
            days: GetSlot(item, DAYS),
            hours: GetSlot(item, HOURS),
            minutes: GetSlot(item, MINUTES),
            seconds: GetSlot(item, SECONDS),
            milliseconds: GetSlot(item, MILLISECONDS),
            microseconds: GetSlot(item, MICROSECONDS),
            nanoseconds: GetSlot(item, NANOSECONDS)
          };
        }
        const props = ES.ToPartialRecord(item, [
          'days',
          'hours',
          'microseconds',
          'milliseconds',
          'minutes',
          'months',
          'nanoseconds',
          'seconds',
          'weeks',
          'years'
        ]);
        if (!props) throw new TypeError('invalid duration-like');
        let {
          years = 0,
          months = 0,
          weeks = 0,
          days = 0,
          hours = 0,
          minutes = 0,
          seconds = 0,
          milliseconds = 0,
          microseconds = 0,
          nanoseconds = 0
        } = props;
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      ToLimitedTemporalDuration: (item, disallowedProperties = []) => {
        let record;
        if (ES.Type(item) === 'Object') {
          record = ES.ToTemporalDurationRecord(item);
        } else {
          const str = ES.ToString(item);
          record = ES.ParseTemporalDurationString(str);
        }
        const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = record;
        ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
        for (const property of disallowedProperties) {
          if (record[property] !== 0) {
            throw new RangeError(
              `Duration field ${property} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
            );
          }
        }
        return record;
      },
      ToTemporalDurationOverflow: (options) => {
        return ES.GetOption(options, 'overflow', ['constrain', 'balance'], 'constrain');
      },
      ToTemporalOverflow: (options) => {
        return ES.GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
      },
      ToTemporalDisambiguation: (options) => {
        return ES.GetOption(options, 'disambiguation', ['compatible', 'earlier', 'later', 'reject'], 'compatible');
      },
      ToTemporalRoundingMode: (options, fallback) => {
        return ES.GetOption(options, 'roundingMode', ['ceil', 'floor', 'trunc', 'halfExpand'], fallback);
      },
      NegateTemporalRoundingMode: (roundingMode) => {
        switch (roundingMode) {
          case 'ceil':
            return 'floor';
          case 'floor':
            return 'ceil';
          default:
            return roundingMode;
        }
      },
      ToTemporalOffset: (options, fallback) => {
        return ES.GetOption(options, 'offset', ['prefer', 'use', 'ignore', 'reject'], fallback);
      },
      ToShowCalendarOption: (options) => {
        return ES.GetOption(options, 'calendarName', ['auto', 'always', 'never'], 'auto');
      },
      ToShowTimeZoneNameOption: (options) => {
        return ES.GetOption(options, 'timeZoneName', ['auto', 'never'], 'auto');
      },
      ToShowOffsetOption: (options) => {
        return ES.GetOption(options, 'offset', ['auto', 'never'], 'auto');
      },
      ToTemporalRoundingIncrement: (options, dividend, inclusive) => {
        let maximum = Infinity;
        if (dividend !== undefined) maximum = dividend;
        if (!inclusive && dividend !== undefined) maximum = dividend > 1 ? dividend - 1 : 1;
        const increment = ES.GetNumberOption(options, 'roundingIncrement', 1, maximum, 1);
        if (dividend !== undefined && dividend % increment !== 0) {
          throw new RangeError(`Rounding increment must divide evenly into ${dividend}`);
        }
        return increment;
      },
      ToTemporalDateTimeRoundingIncrement: (options, smallestUnit) => {
        const maximumIncrements = {
          year: undefined,
          month: undefined,
          week: undefined,
          day: undefined,
          hour: 24,
          minute: 60,
          second: 60,
          millisecond: 1000,
          microsecond: 1000,
          nanosecond: 1000
        };
        return ES.ToTemporalRoundingIncrement(options, maximumIncrements[smallestUnit], false);
      },
      ToSecondsStringPrecision: (options) => {
        let smallestUnit = ES.ToSmallestTemporalUnit(options, undefined, ['year', 'month', 'week', 'day', 'hour']);
        switch (smallestUnit) {
          case 'minute':
            return { precision: 'minute', unit: 'minute', increment: 1 };
          case 'second':
            return { precision: 0, unit: 'second', increment: 1 };
          case 'millisecond':
            return { precision: 3, unit: 'millisecond', increment: 1 };
          case 'microsecond':
            return { precision: 6, unit: 'microsecond', increment: 1 };
          case 'nanosecond':
            return { precision: 9, unit: 'nanosecond', increment: 1 };
        }
        let digits = options.fractionalSecondDigits;
        if (digits === undefined) digits = 'auto';
        if (ES.Type(digits) !== 'Number') {
          digits = ES.ToString(digits);
          if (digits === 'auto') return { precision: 'auto', unit: 'nanosecond', increment: 1 };
          throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
        }
        if (NumberIsNaN(digits) || digits < 0 || digits > 9) {
          throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
        }
        const precision = MathFloor(digits);
        switch (precision) {
          case 0:
            return { precision, unit: 'second', increment: 1 };
          case 1:
          case 2:
          case 3:
            return { precision, unit: 'millisecond', increment: 10 ** (3 - precision) };
          case 4:
          case 5:
          case 6:
            return { precision, unit: 'microsecond', increment: 10 ** (6 - precision) };
          case 7:
          case 8:
          case 9:
            return { precision, unit: 'nanosecond', increment: 10 ** (9 - precision) };
        }
      },
      ToLargestTemporalUnit: (options, fallback, disallowedStrings = [], autoValue) => {
        const singular = new Map(SINGULAR_PLURAL_UNITS.filter(([, sing]) => !disallowedStrings.includes(sing)));
        const allowed = new Set(ALLOWED_UNITS);
        for (const s of disallowedStrings) {
          allowed.delete(s);
        }
        const retval = ES.GetOption(options, 'largestUnit', ['auto', ...allowed, ...singular.keys()], fallback);
        if (retval === 'auto' && autoValue !== undefined) return autoValue;
        if (singular.has(retval)) return singular.get(retval);
        return retval;
      },
      ToSmallestTemporalUnit: (options, fallback, disallowedStrings = []) => {
        const singular = new Map(SINGULAR_PLURAL_UNITS.filter(([, sing]) => !disallowedStrings.includes(sing)));
        const allowed = new Set(ALLOWED_UNITS);
        for (const s of disallowedStrings) {
          allowed.delete(s);
        }
        const value = ES.GetOption(options, 'smallestUnit', [...allowed, ...singular.keys()], fallback);
        if (singular.has(value)) return singular.get(value);
        return value;
      },
      ToTemporalDurationTotalUnit: (options) => {
        // This AO is identical to ToSmallestTemporalUnit, except:
        // - default is always `undefined` (caller will throw if omitted)
        // - option is named `unit` (not `smallestUnit`)
        // - all units are valid (no `disallowedStrings`)
        const singular = new Map(SINGULAR_PLURAL_UNITS);
        const value = ES.GetOption(options, 'unit', [...singular.values(), ...singular.keys()], undefined);
        if (singular.has(value)) return singular.get(value);
        return value;
      },
      ToRelativeTemporalObject: (options) => {
        const relativeTo = options.relativeTo;
        if (relativeTo === undefined) return relativeTo;

        let offsetBehaviour = 'option';
        let matchMinutes = false;
        let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, timeZone, offset;
        if (ES.Type(relativeTo) === 'Object') {
          if (ES.IsTemporalZonedDateTime(relativeTo) || ES.IsTemporalDate(relativeTo)) return relativeTo;
          if (ES.IsTemporalDateTime(relativeTo)) return ES.TemporalDateTimeToDate(relativeTo);
          calendar = ES.GetTemporalCalendarWithISODefault(relativeTo);
          const fieldNames = ES.CalendarFields(calendar, [
            'day',
            'hour',
            'microsecond',
            'millisecond',
            'minute',
            'month',
            'monthCode',
            'nanosecond',
            'second',
            'year'
          ]);
          const fields = ES.ToTemporalDateTimeFields(relativeTo, fieldNames);
          const dateOptions = ObjectCreate$7(null);
          dateOptions.overflow = 'constrain';
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
            ES.InterpretTemporalDateTimeFields(calendar, fields, dateOptions));
          offset = relativeTo.offset;
          if (offset === undefined) offsetBehaviour = 'wall';
          timeZone = relativeTo.timeZone;
        } else {
          let ianaName, z;
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, ianaName, offset, z } =
            ES.ParseISODateTime(ES.ToString(relativeTo), { zoneRequired: false }));
          if (ianaName) timeZone = ianaName;
          if (z) {
            offsetBehaviour = 'exact';
          } else if (!offset) {
            offsetBehaviour = 'wall';
          }
          if (!calendar) calendar = ES.GetISO8601Calendar();
          calendar = ES.ToTemporalCalendar(calendar);
          matchMinutes = true;
        }
        if (timeZone) {
          timeZone = ES.ToTemporalTimeZone(timeZone);
          let offsetNs = 0;
          if (offsetBehaviour === 'option') offsetNs = ES.ParseOffsetString(ES.ToString(offset));
          const epochNanoseconds = ES.InterpretISODateTimeOffset(
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond,
            offsetBehaviour,
            offsetNs,
            timeZone,
            'compatible',
            'reject',
            matchMinutes
          );
          return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
        }
        return ES.CreateTemporalDate(year, month, day, calendar);
      },
      ValidateTemporalUnitRange: (largestUnit, smallestUnit) => {
        if (ALLOWED_UNITS.indexOf(largestUnit) > ALLOWED_UNITS.indexOf(smallestUnit)) {
          throw new RangeError(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
        }
      },
      DefaultTemporalLargestUnit: (
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      ) => {
        const singular = new Map(SINGULAR_PLURAL_UNITS);
        for (const [prop, v] of ObjectEntries({
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        })) {
          if (v !== 0) return singular.get(prop);
        }
        return 'nanosecond';
      },
      LargerOfTwoTemporalUnits: (unit1, unit2) => {
        if (ALLOWED_UNITS.indexOf(unit1) > ALLOWED_UNITS.indexOf(unit2)) return unit2;
        return unit1;
      },
      CastIfDefined: (value, cast) => {
        if (value !== undefined) {
          return cast(value);
        }
        return value;
      },
      ToPartialRecord: (bag, fields, callerCast) => {
        if (ES.Type(bag) !== 'Object') return false;
        let any;
        for (const property of fields) {
          const value = bag[property];
          if (value !== undefined) {
            any = any || {};
            if (callerCast === undefined && BUILTIN_CASTS.has(property)) {
              any[property] = BUILTIN_CASTS.get(property)(value);
            } else if (callerCast !== undefined) {
              any[property] = callerCast(value);
            } else {
              any[property] = value;
            }
          }
        }
        return any ? any : false;
      },
      PrepareTemporalFields: (bag, fields) => {
        if (ES.Type(bag) !== 'Object') return false;
        const result = {};
        let any = false;
        for (const fieldRecord of fields) {
          const [property, defaultValue] = fieldRecord;
          let value = bag[property];
          if (value === undefined) {
            if (fieldRecord.length === 1) {
              throw new TypeError(`required property '${property}' missing or undefined`);
            }
            value = defaultValue;
          } else {
            any = true;
            if (BUILTIN_CASTS.has(property)) {
              value = BUILTIN_CASTS.get(property)(value);
            }
          }
          result[property] = value;
        }
        if (!any) {
          throw new TypeError('no supported properties found');
        }
        if ((result['era'] === undefined) !== (result['eraYear'] === undefined)) {
          throw new RangeError("properties 'era' and 'eraYear' must be provided together");
        }
        return result;
      },
      // field access in the following operations is intentionally alphabetical
      ToTemporalDateFields: (bag, fieldNames) => {
        const entries = [
          ['day', undefined],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        return ES.PrepareTemporalFields(bag, entries);
      },
      ToTemporalDateTimeFields: (bag, fieldNames) => {
        const entries = [
          ['day', undefined],
          ['hour', 0],
          ['microsecond', 0],
          ['millisecond', 0],
          ['minute', 0],
          ['month', undefined],
          ['monthCode', undefined],
          ['nanosecond', 0],
          ['second', 0],
          ['year', undefined]
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        return ES.PrepareTemporalFields(bag, entries);
      },
      ToTemporalMonthDayFields: (bag, fieldNames) => {
        const entries = [
          ['day', undefined],
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        return ES.PrepareTemporalFields(bag, entries);
      },
      ToTemporalTimeRecord: (bag) => {
        return ES.PrepareTemporalFields(bag, [
          ['hour', 0],
          ['microsecond', 0],
          ['millisecond', 0],
          ['minute', 0],
          ['nanosecond', 0],
          ['second', 0]
        ]);
      },
      ToTemporalYearMonthFields: (bag, fieldNames) => {
        const entries = [
          ['month', undefined],
          ['monthCode', undefined],
          ['year', undefined]
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        return ES.PrepareTemporalFields(bag, entries);
      },
      ToTemporalZonedDateTimeFields: (bag, fieldNames) => {
        const entries = [
          ['day', undefined],
          ['hour', 0],
          ['microsecond', 0],
          ['millisecond', 0],
          ['minute', 0],
          ['month', undefined],
          ['monthCode', undefined],
          ['nanosecond', 0],
          ['second', 0],
          ['year', undefined],
          ['offset', undefined],
          ['timeZone']
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        return ES.PrepareTemporalFields(bag, entries);
      },

      ToTemporalDate: (item, options = ObjectCreate$7(null)) => {
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalDate(item)) return item;
          if (ES.IsTemporalZonedDateTime(item)) {
            item = ES.BuiltinTimeZoneGetPlainDateTimeFor(
              GetSlot(item, TIME_ZONE),
              GetSlot(item, INSTANT),
              GetSlot(item, CALENDAR)
            );
          }
          if (ES.IsTemporalDateTime(item)) {
            return ES.CreateTemporalDate(
              GetSlot(item, ISO_YEAR),
              GetSlot(item, ISO_MONTH),
              GetSlot(item, ISO_DAY),
              GetSlot(item, CALENDAR)
            );
          }
          const calendar = ES.GetTemporalCalendarWithISODefault(item);
          const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
          const fields = ES.ToTemporalDateFields(item, fieldNames);
          return ES.DateFromFields(calendar, fields, options);
        }
        ES.ToTemporalOverflow(options); // validate and ignore
        let { year, month, day, calendar, z } = ES.ParseTemporalDateString(ES.ToString(item));
        if (z) throw new RangeError('Z designator not supported for PlainDate');
        const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
        return new TemporalPlainDate(year, month, day, calendar); // include validation
      },
      InterpretTemporalDateTimeFields: (calendar, fields, options) => {
        let { hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(fields);
        const overflow = ES.ToTemporalOverflow(options);
        const date = ES.DateFromFields(calendar, fields, options);
        const year = GetSlot(date, ISO_YEAR);
        const month = GetSlot(date, ISO_MONTH);
        const day = GetSlot(date, ISO_DAY);
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          overflow
        ));
        return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      ToTemporalDateTime: (item, options = ObjectCreate$7(null)) => {
        let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar;
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalDateTime(item)) return item;
          if (ES.IsTemporalZonedDateTime(item)) {
            return ES.BuiltinTimeZoneGetPlainDateTimeFor(
              GetSlot(item, TIME_ZONE),
              GetSlot(item, INSTANT),
              GetSlot(item, CALENDAR)
            );
          }
          if (ES.IsTemporalDate(item)) {
            return ES.CreateTemporalDateTime(
              GetSlot(item, ISO_YEAR),
              GetSlot(item, ISO_MONTH),
              GetSlot(item, ISO_DAY),
              0,
              0,
              0,
              0,
              0,
              0,
              GetSlot(item, CALENDAR)
            );
          }

          calendar = ES.GetTemporalCalendarWithISODefault(item);
          const fieldNames = ES.CalendarFields(calendar, [
            'day',
            'hour',
            'microsecond',
            'millisecond',
            'minute',
            'month',
            'monthCode',
            'nanosecond',
            'second',
            'year'
          ]);
          const fields = ES.ToTemporalDateTimeFields(item, fieldNames);
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
            ES.InterpretTemporalDateTimeFields(calendar, fields, options));
        } else {
          ES.ToTemporalOverflow(options); // validate and ignore
          let z;
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, z } =
            ES.ParseTemporalDateTimeString(ES.ToString(item)));
          if (z) throw new RangeError('Z designator not supported for PlainDateTime');
          ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
          if (calendar === undefined) calendar = ES.GetISO8601Calendar();
          calendar = ES.ToTemporalCalendar(calendar);
        }
        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      },
      ToTemporalDuration: (item) => {
        let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalDuration(item)) return item;
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.ToTemporalDurationRecord(item));
        } else {
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.ParseTemporalDurationString(ES.ToString(item)));
        }
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        return new TemporalDuration(
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        );
      },
      ToTemporalInstant: (item) => {
        if (ES.IsTemporalInstant(item)) return item;
        if (ES.IsTemporalZonedDateTime(item)) {
          const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
          return new TemporalInstant(GetSlot(item, EPOCHNANOSECONDS));
        }
        const ns = ES.ParseTemporalInstant(ES.ToString(item));
        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        return new TemporalInstant(ns);
      },
      ToTemporalMonthDay: (item, options = ObjectCreate$7(null)) => {
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalMonthDay(item)) return item;
          let calendar, calendarAbsent;
          if (HasSlot(item, CALENDAR)) {
            calendar = GetSlot(item, CALENDAR);
            calendarAbsent = false;
          } else {
            calendar = item.calendar;
            calendarAbsent = calendar === undefined;
            if (calendar === undefined) calendar = ES.GetISO8601Calendar();
            calendar = ES.ToTemporalCalendar(calendar);
          }
          const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
          const fields = ES.ToTemporalMonthDayFields(item, fieldNames);
          // Callers who omit the calendar are not writing calendar-independent
          // code. In that case, `monthCode`/`year` can be omitted; `month` and
          // `day` are sufficient. Add a `year` to satisfy calendar validation.
          if (calendarAbsent && fields.month !== undefined && fields.monthCode === undefined && fields.year === undefined) {
            fields.year = 1972;
          }
          return ES.MonthDayFromFields(calendar, fields, options);
        }

        ES.ToTemporalOverflow(options); // validate and ignore
        let { month, day, referenceISOYear, calendar } = ES.ParseTemporalMonthDayString(ES.ToString(item));
        if (calendar === undefined) calendar = ES.GetISO8601Calendar();
        calendar = ES.ToTemporalCalendar(calendar);

        if (referenceISOYear === undefined) {
          ES.RejectISODate(1972, month, day);
          return ES.CreateTemporalMonthDay(month, day, calendar);
        }
        const result = ES.CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
        const canonicalOptions = ObjectCreate$7(null);
        return ES.MonthDayFromFields(calendar, result, canonicalOptions);
      },
      ToTemporalTime: (item, overflow = 'constrain') => {
        let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalTime(item)) return item;
          if (ES.IsTemporalZonedDateTime(item)) {
            item = ES.BuiltinTimeZoneGetPlainDateTimeFor(
              GetSlot(item, TIME_ZONE),
              GetSlot(item, INSTANT),
              GetSlot(item, CALENDAR)
            );
          }
          if (ES.IsTemporalDateTime(item)) {
            const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
            return new TemporalPlainTime(
              GetSlot(item, ISO_HOUR),
              GetSlot(item, ISO_MINUTE),
              GetSlot(item, ISO_SECOND),
              GetSlot(item, ISO_MILLISECOND),
              GetSlot(item, ISO_MICROSECOND),
              GetSlot(item, ISO_NANOSECOND)
            );
          }
          calendar = ES.GetTemporalCalendarWithISODefault(item);
          if (ES.ToString(calendar) !== 'iso8601') {
            throw new RangeError('PlainTime can only have iso8601 calendar');
          }
          ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(item));
          ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond,
            overflow
          ));
        } else {
          ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar } = ES.ParseTemporalTimeString(
            ES.ToString(item)
          ));
          ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
          if (calendar !== undefined && calendar !== 'iso8601') {
            throw new RangeError('PlainTime can only have iso8601 calendar');
          }
        }
        const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
        return new TemporalPlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
      },
      ToTemporalYearMonth: (item, options = ObjectCreate$7(null)) => {
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalYearMonth(item)) return item;
          const calendar = ES.GetTemporalCalendarWithISODefault(item);
          const fieldNames = ES.CalendarFields(calendar, ['month', 'monthCode', 'year']);
          const fields = ES.ToTemporalYearMonthFields(item, fieldNames);
          return ES.YearMonthFromFields(calendar, fields, options);
        }

        ES.ToTemporalOverflow(options); // validate and ignore
        let { year, month, referenceISODay, calendar } = ES.ParseTemporalYearMonthString(ES.ToString(item));
        if (calendar === undefined) calendar = ES.GetISO8601Calendar();
        calendar = ES.ToTemporalCalendar(calendar);

        if (referenceISODay === undefined) {
          ES.RejectISODate(year, month, 1);
          return ES.CreateTemporalYearMonth(year, month, calendar);
        }
        const result = ES.CreateTemporalYearMonth(year, month, calendar, referenceISODay);
        const canonicalOptions = ObjectCreate$7(null);
        return ES.YearMonthFromFields(calendar, result, canonicalOptions);
      },
      InterpretISODateTimeOffset: (
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        offsetBehaviour,
        offsetNs,
        timeZone,
        disambiguation,
        offsetOpt,
        matchMinute
      ) => {
        const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const dt = new DateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

        if (offsetBehaviour === 'wall' || offsetOpt === 'ignore') {
          // Simple case: ISO string without a TZ offset (or caller wants to ignore
          // the offset), so just convert DateTime to Instant in the given time zone
          const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, disambiguation);
          return GetSlot(instant, EPOCHNANOSECONDS);
        }

        // The caller wants the offset to always win ('use') OR the caller is OK
        // with the offset winning ('prefer' or 'reject') as long as it's valid
        // for this timezone and date/time.
        if (offsetBehaviour === 'exact' || offsetOpt === 'use') {
          // Calculate the instant for the input's date/time and offset
          const epochNs = ES.GetEpochFromISOParts(
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond
          );
          if (epochNs === null) throw new RangeError('ZonedDateTime outside of supported range');
          return epochNs.minus(offsetNs);
        }

        // "prefer" or "reject"
        const possibleInstants = ES.GetPossibleInstantsFor(timeZone, dt);
        for (const candidate of possibleInstants) {
          const candidateOffset = ES.GetOffsetNanosecondsFor(timeZone, candidate);
          const roundedCandidateOffset = ES.RoundNumberToIncrement(
            bigInt(candidateOffset),
            60e9,
            'halfExpand'
          ).toJSNumber();
          if (candidateOffset === offsetNs || (matchMinute && roundedCandidateOffset === offsetNs)) {
            return GetSlot(candidate, EPOCHNANOSECONDS);
          }
        }

        // the user-provided offset doesn't match any instants for this time
        // zone and date/time.
        if (offsetOpt === 'reject') {
          const offsetStr = ES.FormatTimeZoneOffsetString(offsetNs);
          const timeZoneString = ES.IsTemporalTimeZone(timeZone) ? GetSlot(timeZone, TIMEZONE_ID) : 'time zone';
          throw new RangeError(`Offset ${offsetStr} is invalid for ${dt} in ${timeZoneString}`);
        }
        // fall through: offsetOpt === 'prefer', but the offset doesn't match
        // so fall back to use the time zone instead.
        const instant = ES.DisambiguatePossibleInstants(possibleInstants, timeZone, dt, disambiguation);
        return GetSlot(instant, EPOCHNANOSECONDS);
      },
      ToTemporalZonedDateTime: (item, options = ObjectCreate$7(null)) => {
        let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, timeZone, offset, calendar;
        let matchMinute = false;
        let offsetBehaviour = 'option';
        if (ES.Type(item) === 'Object') {
          if (ES.IsTemporalZonedDateTime(item)) return item;
          calendar = ES.GetTemporalCalendarWithISODefault(item);
          const fieldNames = ES.CalendarFields(calendar, [
            'day',
            'hour',
            'microsecond',
            'millisecond',
            'minute',
            'month',
            'monthCode',
            'nanosecond',
            'second',
            'year'
          ]);
          const fields = ES.ToTemporalZonedDateTimeFields(item, fieldNames);
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
            ES.InterpretTemporalDateTimeFields(calendar, fields, options));
          timeZone = ES.ToTemporalTimeZone(fields.timeZone);
          offset = fields.offset;
          if (offset === undefined) {
            offsetBehaviour = 'wall';
          } else {
            offset = ES.ToString(offset);
          }
        } else {
          ES.ToTemporalOverflow(options); // validate and ignore
          let ianaName, z;
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, ianaName, offset, z, calendar } =
            ES.ParseTemporalZonedDateTimeString(ES.ToString(item)));
          if (!ianaName) throw new RangeError('time zone ID required in brackets');
          if (z) {
            offsetBehaviour = 'exact';
          } else if (!offset) {
            offsetBehaviour = 'wall';
          }
          const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
          timeZone = new TemporalTimeZone(ianaName);
          if (!calendar) calendar = ES.GetISO8601Calendar();
          calendar = ES.ToTemporalCalendar(calendar);
          matchMinute = true; // ISO strings may specify offset with less precision
        }
        let offsetNs = 0;
        if (offsetBehaviour === 'option') offsetNs = ES.ParseOffsetString(offset);
        const disambiguation = ES.ToTemporalDisambiguation(options);
        const offsetOpt = ES.ToTemporalOffset(options, 'reject');
        const epochNanoseconds = ES.InterpretISODateTimeOffset(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          offsetBehaviour,
          offsetNs,
          timeZone,
          disambiguation,
          offsetOpt,
          matchMinute
        );
        return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
      },

      CreateTemporalDateSlots: (result, isoYear, isoMonth, isoDay, calendar) => {
        ES.RejectISODate(isoYear, isoMonth, isoDay);
        ES.RejectDateRange(isoYear, isoMonth, isoDay);

        CreateSlots(result);
        SetSlot(result, ISO_YEAR, isoYear);
        SetSlot(result, ISO_MONTH, isoMonth);
        SetSlot(result, ISO_DAY, isoDay);
        SetSlot(result, CALENDAR, calendar);
        SetSlot(result, DATE_BRAND, true);
      },
      CreateTemporalDate: (isoYear, isoMonth, isoDay, calendar = ES.GetISO8601Calendar()) => {
        const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
        const result = ObjectCreate$7(TemporalPlainDate.prototype);
        ES.CreateTemporalDateSlots(result, isoYear, isoMonth, isoDay, calendar);
        return result;
      },
      CreateTemporalDateTimeSlots: (result, isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar) => {
        ES.RejectDateTime(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);
        ES.RejectDateTimeRange(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);

        CreateSlots(result);
        SetSlot(result, ISO_YEAR, isoYear);
        SetSlot(result, ISO_MONTH, isoMonth);
        SetSlot(result, ISO_DAY, isoDay);
        SetSlot(result, ISO_HOUR, h);
        SetSlot(result, ISO_MINUTE, min);
        SetSlot(result, ISO_SECOND, s);
        SetSlot(result, ISO_MILLISECOND, ms);
        SetSlot(result, ISO_MICROSECOND, µs);
        SetSlot(result, ISO_NANOSECOND, ns);
        SetSlot(result, CALENDAR, calendar);
      },
      CreateTemporalDateTime: (isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar = ES.GetISO8601Calendar()) => {
        const TemporalPlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const result = ObjectCreate$7(TemporalPlainDateTime.prototype);
        ES.CreateTemporalDateTimeSlots(result, isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar);
        return result;
      },
      CreateTemporalMonthDaySlots: (result, isoMonth, isoDay, calendar, referenceISOYear) => {
        ES.RejectISODate(referenceISOYear, isoMonth, isoDay);
        ES.RejectDateRange(referenceISOYear, isoMonth, isoDay);

        CreateSlots(result);
        SetSlot(result, ISO_MONTH, isoMonth);
        SetSlot(result, ISO_DAY, isoDay);
        SetSlot(result, ISO_YEAR, referenceISOYear);
        SetSlot(result, CALENDAR, calendar);
        SetSlot(result, MONTH_DAY_BRAND, true);
      },
      CreateTemporalMonthDay: (isoMonth, isoDay, calendar = ES.GetISO8601Calendar(), referenceISOYear = 1972) => {
        const TemporalPlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
        const result = ObjectCreate$7(TemporalPlainMonthDay.prototype);
        ES.CreateTemporalMonthDaySlots(result, isoMonth, isoDay, calendar, referenceISOYear);
        return result;
      },
      CreateTemporalYearMonthSlots: (result, isoYear, isoMonth, calendar, referenceISODay) => {
        ES.RejectISODate(isoYear, isoMonth, referenceISODay);
        ES.RejectYearMonthRange(isoYear, isoMonth);

        CreateSlots(result);
        SetSlot(result, ISO_YEAR, isoYear);
        SetSlot(result, ISO_MONTH, isoMonth);
        SetSlot(result, ISO_DAY, referenceISODay);
        SetSlot(result, CALENDAR, calendar);
        SetSlot(result, YEAR_MONTH_BRAND, true);
      },
      CreateTemporalYearMonth: (isoYear, isoMonth, calendar = ES.GetISO8601Calendar(), referenceISODay = 1) => {
        const TemporalPlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
        const result = ObjectCreate$7(TemporalPlainYearMonth.prototype);
        ES.CreateTemporalYearMonthSlots(result, isoYear, isoMonth, calendar, referenceISODay);
        return result;
      },
      CreateTemporalZonedDateTimeSlots: (result, epochNanoseconds, timeZone, calendar) => {
        ES.ValidateEpochNanoseconds(epochNanoseconds);

        CreateSlots(result);
        SetSlot(result, EPOCHNANOSECONDS, epochNanoseconds);
        SetSlot(result, TIME_ZONE, timeZone);
        SetSlot(result, CALENDAR, calendar);

        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        const instant = new TemporalInstant(GetSlot(result, EPOCHNANOSECONDS));
        SetSlot(result, INSTANT, instant);
      },
      CreateTemporalZonedDateTime: (epochNanoseconds, timeZone, calendar = ES.GetISO8601Calendar()) => {
        const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
        const result = ObjectCreate$7(TemporalZonedDateTime.prototype);
        ES.CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
        return result;
      },

      GetISO8601Calendar: () => {
        const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
        return new TemporalCalendar('iso8601');
      },
      CalendarFields: (calendar, fieldNames) => {
        const fields = ES.GetMethod(calendar, 'fields');
        if (fields !== undefined) fieldNames = ES.Call(fields, calendar, [fieldNames]);
        const result = [];
        for (const name of fieldNames) {
          if (ES.Type(name) !== 'String') throw new TypeError('bad return from calendar.fields()');
          ArrayPrototypePush$1.call(result, name);
        }
        return result;
      },
      CalendarMergeFields: (calendar, fields, additionalFields) => {
        const mergeFields = ES.GetMethod(calendar, 'mergeFields');
        if (mergeFields === undefined) return { ...fields, ...additionalFields };
        const result = ES.Call(mergeFields, calendar, [fields, additionalFields]);
        if (ES.Type(result) !== 'Object') throw new TypeError('bad return from calendar.mergeFields()');
        return result;
      },
      CalendarDateAdd: (calendar, date, duration, options, dateAdd) => {
        if (dateAdd === undefined) {
          dateAdd = ES.GetMethod(calendar, 'dateAdd');
        }
        const result = ES.Call(dateAdd, calendar, [date, duration, options]);
        if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
        return result;
      },
      CalendarDateUntil: (calendar, date, otherDate, options, dateUntil) => {
        if (dateUntil === undefined) {
          dateUntil = ES.GetMethod(calendar, 'dateUntil');
        }
        const result = ES.Call(dateUntil, calendar, [date, otherDate, options]);
        if (!ES.IsTemporalDuration(result)) throw new TypeError('invalid result');
        return result;
      },
      CalendarYear: (calendar, dateLike) => {
        const year = ES.GetMethod(calendar, 'year');
        const result = ES.Call(year, calendar, [dateLike]);
        if (result === undefined) {
          throw new RangeError('calendar year result must be an integer');
        }
        return ES.ToIntegerThrowOnInfinity(result);
      },
      CalendarMonth: (calendar, dateLike) => {
        const month = ES.GetMethod(calendar, 'month');
        const result = ES.Call(month, calendar, [dateLike]);
        if (result === undefined) {
          throw new RangeError('calendar month result must be a positive integer');
        }
        return ES.ToPositiveInteger(result);
      },
      CalendarMonthCode: (calendar, dateLike) => {
        const monthCode = ES.GetMethod(calendar, 'monthCode');
        const result = ES.Call(monthCode, calendar, [dateLike]);
        if (result === undefined) {
          throw new RangeError('calendar monthCode result must be a string');
        }
        return ES.ToString(result);
      },
      CalendarDay: (calendar, dateLike) => {
        const day = ES.GetMethod(calendar, 'day');
        const result = ES.Call(day, calendar, [dateLike]);
        if (result === undefined) {
          throw new RangeError('calendar day result must be a positive integer');
        }
        return ES.ToPositiveInteger(result);
      },
      CalendarEra: (calendar, dateLike) => {
        const era = ES.GetMethod(calendar, 'era');
        let result = ES.Call(era, calendar, [dateLike]);
        if (result !== undefined) {
          result = ES.ToString(result);
        }
        return result;
      },
      CalendarEraYear: (calendar, dateLike) => {
        const eraYear = ES.GetMethod(calendar, 'eraYear');
        let result = ES.Call(eraYear, calendar, [dateLike]);
        if (result !== undefined) {
          result = ES.ToIntegerThrowOnInfinity(result);
        }
        return result;
      },
      CalendarDayOfWeek: (calendar, dateLike) => {
        const dayOfWeek = ES.GetMethod(calendar, 'dayOfWeek');
        return ES.Call(dayOfWeek, calendar, [dateLike]);
      },
      CalendarDayOfYear: (calendar, dateLike) => {
        const dayOfYear = ES.GetMethod(calendar, 'dayOfYear');
        return ES.Call(dayOfYear, calendar, [dateLike]);
      },
      CalendarWeekOfYear: (calendar, dateLike) => {
        const weekOfYear = ES.GetMethod(calendar, 'weekOfYear');
        return ES.Call(weekOfYear, calendar, [dateLike]);
      },
      CalendarDaysInWeek: (calendar, dateLike) => {
        const daysInWeek = ES.GetMethod(calendar, 'daysInWeek');
        return ES.Call(daysInWeek, calendar, [dateLike]);
      },
      CalendarDaysInMonth: (calendar, dateLike) => {
        const daysInMonth = ES.GetMethod(calendar, 'daysInMonth');
        return ES.Call(daysInMonth, calendar, [dateLike]);
      },
      CalendarDaysInYear: (calendar, dateLike) => {
        const daysInYear = ES.GetMethod(calendar, 'daysInYear');
        return ES.Call(daysInYear, calendar, [dateLike]);
      },
      CalendarMonthsInYear: (calendar, dateLike) => {
        const monthsInYear = ES.GetMethod(calendar, 'monthsInYear');
        return ES.Call(monthsInYear, calendar, [dateLike]);
      },
      CalendarInLeapYear: (calendar, dateLike) => {
        const inLeapYear = ES.GetMethod(calendar, 'inLeapYear');
        return ES.Call(inLeapYear, calendar, [dateLike]);
      },

      ToTemporalCalendar: (calendarLike) => {
        if (ES.Type(calendarLike) === 'Object') {
          if (HasSlot(calendarLike, CALENDAR)) return GetSlot(calendarLike, CALENDAR);
          if (!('calendar' in calendarLike)) return calendarLike;
          calendarLike = calendarLike.calendar;
          if (ES.Type(calendarLike) === 'Object' && !('calendar' in calendarLike)) return calendarLike;
        }
        const identifier = ES.ToString(calendarLike);
        const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
        if (IsBuiltinCalendar(identifier)) return new TemporalCalendar(identifier);
        let calendar;
        try {
          ({ calendar } = ES.ParseISODateTime(identifier, { zoneRequired: false }));
        } catch {
          throw new RangeError(`Invalid calendar: ${identifier}`);
        }
        if (!calendar) calendar = 'iso8601';
        return new TemporalCalendar(calendar);
      },
      GetTemporalCalendarWithISODefault: (item) => {
        if (HasSlot(item, CALENDAR)) return GetSlot(item, CALENDAR);
        const { calendar } = item;
        if (calendar === undefined) return ES.GetISO8601Calendar();
        return ES.ToTemporalCalendar(calendar);
      },
      CalendarCompare: (one, two) => {
        const cal1 = ES.ToString(one);
        const cal2 = ES.ToString(two);
        return cal1 < cal2 ? -1 : cal1 > cal2 ? 1 : 0;
      },
      CalendarEquals: (one, two) => {
        if (one === two) return true;
        const cal1 = ES.ToString(one);
        const cal2 = ES.ToString(two);
        return cal1 === cal2;
      },
      ConsolidateCalendars: (one, two) => {
        if (one === two) return two;
        const sOne = ES.ToString(one);
        const sTwo = ES.ToString(two);
        if (sOne === sTwo || sOne === 'iso8601') {
          return two;
        } else if (sTwo === 'iso8601') {
          return one;
        } else {
          throw new RangeError('irreconcilable calendars');
        }
      },
      DateFromFields: (calendar, fields, options) => {
        const dateFromFields = ES.GetMethod(calendar, 'dateFromFields');
        const result = ES.Call(dateFromFields, calendar, [fields, options]);
        if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
        return result;
      },
      YearMonthFromFields: (calendar, fields, options) => {
        const yearMonthFromFields = ES.GetMethod(calendar, 'yearMonthFromFields');
        const result = ES.Call(yearMonthFromFields, calendar, [fields, options]);
        if (!ES.IsTemporalYearMonth(result)) throw new TypeError('invalid result');
        return result;
      },
      MonthDayFromFields: (calendar, fields, options) => {
        const monthDayFromFields = ES.GetMethod(calendar, 'monthDayFromFields');
        const result = ES.Call(monthDayFromFields, calendar, [fields, options]);
        if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
        return result;
      },

      ToTemporalTimeZone: (temporalTimeZoneLike) => {
        if (ES.Type(temporalTimeZoneLike) === 'Object') {
          if (ES.IsTemporalZonedDateTime(temporalTimeZoneLike)) return GetSlot(temporalTimeZoneLike, TIME_ZONE);
          if (!('timeZone' in temporalTimeZoneLike)) return temporalTimeZoneLike;
          temporalTimeZoneLike = temporalTimeZoneLike.timeZone;
          if (ES.Type(temporalTimeZoneLike) === 'Object' && !('timeZone' in temporalTimeZoneLike)) {
            return temporalTimeZoneLike;
          }
        }
        const identifier = ES.ToString(temporalTimeZoneLike);
        const timeZone = ES.ParseTemporalTimeZone(identifier);
        const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
        return new TemporalTimeZone(timeZone);
      },
      TimeZoneEquals: (one, two) => {
        if (one === two) return true;
        const tz1 = ES.ToString(one);
        const tz2 = ES.ToString(two);
        return tz1 === tz2;
      },
      TemporalDateTimeToDate: (dateTime) => {
        return ES.CreateTemporalDate(
          GetSlot(dateTime, ISO_YEAR),
          GetSlot(dateTime, ISO_MONTH),
          GetSlot(dateTime, ISO_DAY),
          GetSlot(dateTime, CALENDAR)
        );
      },
      TemporalDateTimeToTime: (dateTime) => {
        const Time = GetIntrinsic('%Temporal.PlainTime%');
        return new Time(
          GetSlot(dateTime, ISO_HOUR),
          GetSlot(dateTime, ISO_MINUTE),
          GetSlot(dateTime, ISO_SECOND),
          GetSlot(dateTime, ISO_MILLISECOND),
          GetSlot(dateTime, ISO_MICROSECOND),
          GetSlot(dateTime, ISO_NANOSECOND)
        );
      },
      GetOffsetNanosecondsFor: (timeZone, instant) => {
        const getOffsetNanosecondsFor = ES.GetMethod(timeZone, 'getOffsetNanosecondsFor');
        const offsetNs = ES.Call(getOffsetNanosecondsFor, timeZone, [instant]);
        if (typeof offsetNs !== 'number') {
          throw new TypeError('bad return from getOffsetNanosecondsFor');
        }
        if (!ES.IsInteger(offsetNs) || MathAbs(offsetNs) > 86400e9) {
          throw new RangeError('out-of-range return from getOffsetNanosecondsFor');
        }
        return offsetNs;
      },
      BuiltinTimeZoneGetOffsetStringFor: (timeZone, instant) => {
        const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, instant);
        return ES.FormatTimeZoneOffsetString(offsetNs);
      },
      BuiltinTimeZoneGetPlainDateTimeFor: (timeZone, instant, calendar) => {
        const ns = GetSlot(instant, EPOCHNANOSECONDS);
        const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, instant);
        let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.GetISOPartsFromEpoch(ns);
        ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceISODateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond + offsetNs
        ));
        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      },
      BuiltinTimeZoneGetInstantFor: (timeZone, dateTime, disambiguation) => {
        const possibleInstants = ES.GetPossibleInstantsFor(timeZone, dateTime);
        return ES.DisambiguatePossibleInstants(possibleInstants, timeZone, dateTime, disambiguation);
      },
      DisambiguatePossibleInstants: (possibleInstants, timeZone, dateTime, disambiguation) => {
        const Instant = GetIntrinsic('%Temporal.Instant%');
        const numInstants = possibleInstants.length;

        if (numInstants === 1) return possibleInstants[0];
        if (numInstants) {
          switch (disambiguation) {
            case 'compatible':
            // fall through because 'compatible' means 'earlier' for "fall back" transitions
            case 'earlier':
              return possibleInstants[0];
            case 'later':
              return possibleInstants[numInstants - 1];
            case 'reject': {
              throw new RangeError('multiple instants found');
            }
          }
        }

        const year = GetSlot(dateTime, ISO_YEAR);
        const month = GetSlot(dateTime, ISO_MONTH);
        const day = GetSlot(dateTime, ISO_DAY);
        const hour = GetSlot(dateTime, ISO_HOUR);
        const minute = GetSlot(dateTime, ISO_MINUTE);
        const second = GetSlot(dateTime, ISO_SECOND);
        const millisecond = GetSlot(dateTime, ISO_MILLISECOND);
        const microsecond = GetSlot(dateTime, ISO_MICROSECOND);
        const nanosecond = GetSlot(dateTime, ISO_NANOSECOND);
        const utcns = ES.GetEpochFromISOParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
        if (utcns === null) throw new RangeError('DateTime outside of supported range');
        const dayBefore = new Instant(utcns.minus(86400e9));
        const dayAfter = new Instant(utcns.plus(86400e9));
        const offsetBefore = ES.GetOffsetNanosecondsFor(timeZone, dayBefore);
        const offsetAfter = ES.GetOffsetNanosecondsFor(timeZone, dayAfter);
        const nanoseconds = offsetAfter - offsetBefore;
        switch (disambiguation) {
          case 'earlier': {
            const calendar = GetSlot(dateTime, CALENDAR);
            const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
            const earlier = ES.AddDateTime(
              year,
              month,
              day,
              hour,
              minute,
              second,
              millisecond,
              microsecond,
              nanosecond,
              calendar,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              -nanoseconds,
              undefined
            );
            const earlierPlainDateTime = new PlainDateTime(
              earlier.year,
              earlier.month,
              earlier.day,
              earlier.hour,
              earlier.minute,
              earlier.second,
              earlier.millisecond,
              earlier.microsecond,
              earlier.nanosecond,
              calendar
            );
            return ES.GetPossibleInstantsFor(timeZone, earlierPlainDateTime)[0];
          }
          case 'compatible':
          // fall through because 'compatible' means 'later' for "spring forward" transitions
          case 'later': {
            const calendar = GetSlot(dateTime, CALENDAR);
            const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
            const later = ES.AddDateTime(
              year,
              month,
              day,
              hour,
              minute,
              second,
              millisecond,
              microsecond,
              nanosecond,
              calendar,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              nanoseconds,
              undefined
            );
            const laterPlainDateTime = new PlainDateTime(
              later.year,
              later.month,
              later.day,
              later.hour,
              later.minute,
              later.second,
              later.millisecond,
              later.microsecond,
              later.nanosecond,
              calendar
            );
            const possible = ES.GetPossibleInstantsFor(timeZone, laterPlainDateTime);
            return possible[possible.length - 1];
          }
          case 'reject': {
            throw new RangeError('no such instant found');
          }
        }
      },
      GetPossibleInstantsFor: (timeZone, dateTime) => {
        let getPossibleInstantsFor = ES.GetMethod(timeZone, 'getPossibleInstantsFor');
        const possibleInstants = ES.Call(getPossibleInstantsFor, timeZone, [dateTime]);
        const result = [];
        for (const instant of possibleInstants) {
          if (!ES.IsTemporalInstant(instant)) {
            throw new TypeError('bad return from getPossibleInstantsFor');
          }
          ArrayPrototypePush$1.call(result, instant);
        }
        return result;
      },
      ISOYearString: (year) => {
        let yearString;
        if (year < 1000 || year > 9999) {
          let sign = year < 0 ? '-' : '+';
          let yearNumber = MathAbs(year);
          yearString = sign + `000000${yearNumber}`.slice(-6);
        } else {
          yearString = `${year}`;
        }
        return yearString;
      },
      ISODateTimePartString: (part) => `00${part}`.slice(-2),
      FormatSecondsStringPart: (second, millisecond, microsecond, nanosecond, precision) => {
        if (precision === 'minute') return '';

        const secs = `:${ES.ISODateTimePartString(second)}`;
        let fraction = millisecond * 1e6 + microsecond * 1e3 + nanosecond;

        if (precision === 'auto') {
          if (fraction === 0) return secs;
          fraction = `${fraction}`.padStart(9, '0');
          while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
        } else {
          if (precision === 0) return secs;
          fraction = `${fraction}`.padStart(9, '0').slice(0, precision);
        }
        return `${secs}.${fraction}`;
      },
      TemporalInstantToString: (instant, timeZone, precision) => {
        let outputTimeZone = timeZone;
        if (outputTimeZone === undefined) {
          const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
          outputTimeZone = new TemporalTimeZone('UTC');
        }
        const iso = ES.GetISO8601Calendar();
        const dateTime = ES.BuiltinTimeZoneGetPlainDateTimeFor(outputTimeZone, instant, iso);
        const year = ES.ISOYearString(GetSlot(dateTime, ISO_YEAR));
        const month = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
        const day = ES.ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
        const hour = ES.ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
        const minute = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
        const seconds = ES.FormatSecondsStringPart(
          GetSlot(dateTime, ISO_SECOND),
          GetSlot(dateTime, ISO_MILLISECOND),
          GetSlot(dateTime, ISO_MICROSECOND),
          GetSlot(dateTime, ISO_NANOSECOND),
          precision
        );
        let timeZoneString = 'Z';
        if (timeZone !== undefined) {
          const offsetNs = ES.GetOffsetNanosecondsFor(outputTimeZone, instant);
          timeZoneString = ES.FormatISOTimeZoneOffsetString(offsetNs);
        }
        return `${year}-${month}-${day}T${hour}:${minute}${seconds}${timeZoneString}`;
      },
      TemporalDurationToString: (duration, precision = 'auto', options = undefined) => {
        function formatNumber(num) {
          if (num <= NumberMaxSafeInteger) return num.toString(10);
          return bigInt(num).toString();
        }

        const years = GetSlot(duration, YEARS);
        const months = GetSlot(duration, MONTHS);
        const weeks = GetSlot(duration, WEEKS);
        const days = GetSlot(duration, DAYS);
        const hours = GetSlot(duration, HOURS);
        const minutes = GetSlot(duration, MINUTES);
        let seconds = GetSlot(duration, SECONDS);
        let ms = GetSlot(duration, MILLISECONDS);
        let µs = GetSlot(duration, MICROSECONDS);
        let ns = GetSlot(duration, NANOSECONDS);
        const sign = ES.DurationSign(years, months, weeks, days, hours, minutes, seconds, ms, µs, ns);

        if (options) {
          const { unit, increment, roundingMode } = options;
          ({
            seconds,
            milliseconds: ms,
            microseconds: µs,
            nanoseconds: ns
          } = ES.RoundDuration(0, 0, 0, 0, 0, 0, seconds, ms, µs, ns, increment, unit, roundingMode));
        }

        const dateParts = [];
        if (years) dateParts.push(`${formatNumber(MathAbs(years))}Y`);
        if (months) dateParts.push(`${formatNumber(MathAbs(months))}M`);
        if (weeks) dateParts.push(`${formatNumber(MathAbs(weeks))}W`);
        if (days) dateParts.push(`${formatNumber(MathAbs(days))}D`);

        const timeParts = [];
        if (hours) timeParts.push(`${formatNumber(MathAbs(hours))}H`);
        if (minutes) timeParts.push(`${formatNumber(MathAbs(minutes))}M`);

        const secondParts = [];
        let total = ES.TotalDurationNanoseconds(0, 0, 0, seconds, ms, µs, ns, 0);
        ({ quotient: total, remainder: ns } = total.divmod(1000));
        ({ quotient: total, remainder: µs } = total.divmod(1000));
        ({ quotient: seconds, remainder: ms } = total.divmod(1000));
        let fraction = MathAbs(ms.toJSNumber()) * 1e6 + MathAbs(µs.toJSNumber()) * 1e3 + MathAbs(ns.toJSNumber());
        let decimalPart;
        if (precision === 'auto') {
          if (fraction !== 0) {
            decimalPart = `${fraction}`.padStart(9, '0');
            while (decimalPart[decimalPart.length - 1] === '0') {
              decimalPart = decimalPart.slice(0, -1);
            }
          }
        } else if (precision !== 0) {
          decimalPart = `${fraction}`.padStart(9, '0').slice(0, precision);
        }
        if (decimalPart) secondParts.unshift('.', decimalPart);
        if (!seconds.isZero() || secondParts.length) secondParts.unshift(seconds.abs().toString());
        if (secondParts.length) timeParts.push(`${secondParts.join('')}S`);
        if (timeParts.length) timeParts.unshift('T');
        if (!dateParts.length && !timeParts.length) return 'PT0S';
        return `${sign < 0 ? '-' : ''}P${dateParts.join('')}${timeParts.join('')}`;
      },
      TemporalDateToString: (date, showCalendar = 'auto') => {
        const year = ES.ISOYearString(GetSlot(date, ISO_YEAR));
        const month = ES.ISODateTimePartString(GetSlot(date, ISO_MONTH));
        const day = ES.ISODateTimePartString(GetSlot(date, ISO_DAY));
        const calendarID = ES.ToString(GetSlot(date, CALENDAR));
        const calendar = ES.FormatCalendarAnnotation(calendarID, showCalendar);
        return `${year}-${month}-${day}${calendar}`;
      },
      TemporalDateTimeToString: (dateTime, precision, showCalendar = 'auto', options = undefined) => {
        let year = GetSlot(dateTime, ISO_YEAR);
        let month = GetSlot(dateTime, ISO_MONTH);
        let day = GetSlot(dateTime, ISO_DAY);
        let hour = GetSlot(dateTime, ISO_HOUR);
        let minute = GetSlot(dateTime, ISO_MINUTE);
        let second = GetSlot(dateTime, ISO_SECOND);
        let millisecond = GetSlot(dateTime, ISO_MILLISECOND);
        let microsecond = GetSlot(dateTime, ISO_MICROSECOND);
        let nanosecond = GetSlot(dateTime, ISO_NANOSECOND);

        if (options) {
          const { unit, increment, roundingMode } = options;
          ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond,
            increment,
            unit,
            roundingMode
          ));
        }

        year = ES.ISOYearString(year);
        month = ES.ISODateTimePartString(month);
        day = ES.ISODateTimePartString(day);
        hour = ES.ISODateTimePartString(hour);
        minute = ES.ISODateTimePartString(minute);
        const seconds = ES.FormatSecondsStringPart(second, millisecond, microsecond, nanosecond, precision);
        const calendarID = ES.ToString(GetSlot(dateTime, CALENDAR));
        const calendar = ES.FormatCalendarAnnotation(calendarID, showCalendar);
        return `${year}-${month}-${day}T${hour}:${minute}${seconds}${calendar}`;
      },
      TemporalMonthDayToString: (monthDay, showCalendar = 'auto') => {
        const month = ES.ISODateTimePartString(GetSlot(monthDay, ISO_MONTH));
        const day = ES.ISODateTimePartString(GetSlot(monthDay, ISO_DAY));
        let resultString = `${month}-${day}`;
        const calendar = GetSlot(monthDay, CALENDAR);
        const calendarID = ES.ToString(calendar);
        if (calendarID !== 'iso8601') {
          const year = ES.ISOYearString(GetSlot(monthDay, ISO_YEAR));
          resultString = `${year}-${resultString}`;
        }
        const calendarString = ES.FormatCalendarAnnotation(calendarID, showCalendar);
        if (calendarString) resultString += calendarString;
        return resultString;
      },
      TemporalYearMonthToString: (yearMonth, showCalendar = 'auto') => {
        const year = ES.ISOYearString(GetSlot(yearMonth, ISO_YEAR));
        const month = ES.ISODateTimePartString(GetSlot(yearMonth, ISO_MONTH));
        let resultString = `${year}-${month}`;
        const calendar = GetSlot(yearMonth, CALENDAR);
        const calendarID = ES.ToString(calendar);
        if (calendarID !== 'iso8601') {
          const day = ES.ISODateTimePartString(GetSlot(yearMonth, ISO_DAY));
          resultString += `-${day}`;
        }
        const calendarString = ES.FormatCalendarAnnotation(calendarID, showCalendar);
        if (calendarString) resultString += calendarString;
        return resultString;
      },
      TemporalZonedDateTimeToString: (
        zdt,
        precision,
        showCalendar = 'auto',
        showTimeZone = 'auto',
        showOffset = 'auto',
        options = undefined
      ) => {
        let instant = GetSlot(zdt, INSTANT);

        if (options) {
          const { unit, increment, roundingMode } = options;
          const ns = ES.RoundInstant(GetSlot(zdt, EPOCHNANOSECONDS), increment, unit, roundingMode);
          const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
          instant = new TemporalInstant(ns);
        }

        const tz = GetSlot(zdt, TIME_ZONE);
        const iso = ES.GetISO8601Calendar();
        const dateTime = ES.BuiltinTimeZoneGetPlainDateTimeFor(tz, instant, iso);

        const year = ES.ISOYearString(GetSlot(dateTime, ISO_YEAR));
        const month = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
        const day = ES.ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
        const hour = ES.ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
        const minute = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
        const seconds = ES.FormatSecondsStringPart(
          GetSlot(dateTime, ISO_SECOND),
          GetSlot(dateTime, ISO_MILLISECOND),
          GetSlot(dateTime, ISO_MICROSECOND),
          GetSlot(dateTime, ISO_NANOSECOND),
          precision
        );
        let result = `${year}-${month}-${day}T${hour}:${minute}${seconds}`;
        if (showOffset !== 'never') {
          const offsetNs = ES.GetOffsetNanosecondsFor(tz, instant);
          result += ES.FormatISOTimeZoneOffsetString(offsetNs);
        }
        if (showTimeZone !== 'never') result += `[${tz}]`;
        const calendarID = ES.ToString(GetSlot(zdt, CALENDAR));
        result += ES.FormatCalendarAnnotation(calendarID, showCalendar);
        return result;
      },

      ParseOffsetString: (string) => {
        const match = OFFSET.exec(String(string));
        if (!match) return null;
        const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : +1;
        const hours = +match[2];
        const minutes = +(match[3] || 0);
        const seconds = +(match[4] || 0);
        const nanoseconds = +((match[5] || 0) + '000000000').slice(0, 9);
        return sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
      },
      GetCanonicalTimeZoneIdentifier: (timeZoneIdentifier) => {
        const offsetNs = ES.ParseOffsetString(timeZoneIdentifier);
        if (offsetNs !== null) return ES.FormatTimeZoneOffsetString(offsetNs);
        const formatter = getIntlDateTimeFormatEnUsForTimeZone(String(timeZoneIdentifier));
        return formatter.resolvedOptions().timeZone;
      },
      GetIANATimeZoneOffsetNanoseconds: (epochNanoseconds, id) => {
        const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
          ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
        const utc = ES.GetEpochFromISOParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
        if (utc === null) throw new RangeError('Date outside of supported range');
        return +utc.minus(epochNanoseconds);
      },
      FormatTimeZoneOffsetString: (offsetNanoseconds) => {
        const sign = offsetNanoseconds < 0 ? '-' : '+';
        offsetNanoseconds = MathAbs(offsetNanoseconds);
        const nanoseconds = offsetNanoseconds % 1e9;
        const seconds = MathFloor(offsetNanoseconds / 1e9) % 60;
        const minutes = MathFloor(offsetNanoseconds / 60e9) % 60;
        const hours = MathFloor(offsetNanoseconds / 3600e9);

        const hourString = ES.ISODateTimePartString(hours);
        const minuteString = ES.ISODateTimePartString(minutes);
        const secondString = ES.ISODateTimePartString(seconds);
        let post = '';
        if (nanoseconds) {
          let fraction = `${nanoseconds}`.padStart(9, '0');
          while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
          post = `:${secondString}.${fraction}`;
        } else if (seconds) {
          post = `:${secondString}`;
        }
        return `${sign}${hourString}:${minuteString}${post}`;
      },
      FormatISOTimeZoneOffsetString: (offsetNanoseconds) => {
        offsetNanoseconds = ES.RoundNumberToIncrement(bigInt(offsetNanoseconds), 60e9, 'halfExpand').toJSNumber();
        const sign = offsetNanoseconds < 0 ? '-' : '+';
        offsetNanoseconds = MathAbs(offsetNanoseconds);
        const minutes = (offsetNanoseconds / 60e9) % 60;
        const hours = MathFloor(offsetNanoseconds / 3600e9);

        const hourString = ES.ISODateTimePartString(hours);
        const minuteString = ES.ISODateTimePartString(minutes);
        return `${sign}${hourString}:${minuteString}`;
      },
      GetEpochFromISOParts: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        // Note: Date.UTC() interprets one and two-digit years as being in the
        // 20th century, so don't use it
        const legacyDate = new Date();
        legacyDate.setUTCHours(hour, minute, second, millisecond);
        legacyDate.setUTCFullYear(year, month - 1, day);
        const ms = legacyDate.getTime();
        if (NumberIsNaN(ms)) return null;
        let ns = bigInt(ms).multiply(1e6);
        ns = ns.plus(bigInt(microsecond).multiply(1e3));
        ns = ns.plus(bigInt(nanosecond));
        if (ns.lesser(NS_MIN) || ns.greater(NS_MAX)) return null;
        return ns;
      },
      GetISOPartsFromEpoch: (epochNanoseconds) => {
        const { quotient, remainder } = bigInt(epochNanoseconds).divmod(1e6);
        let epochMilliseconds = +quotient;
        let nanos = +remainder;
        if (nanos < 0) {
          nanos += 1e6;
          epochMilliseconds -= 1;
        }
        const microsecond = MathFloor(nanos / 1e3) % 1e3;
        const nanosecond = nanos % 1e3;

        const item = new Date(epochMilliseconds);
        const year = item.getUTCFullYear();
        const month = item.getUTCMonth() + 1;
        const day = item.getUTCDate();
        const hour = item.getUTCHours();
        const minute = item.getUTCMinutes();
        const second = item.getUTCSeconds();
        const millisecond = item.getUTCMilliseconds();

        return { epochMilliseconds, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      GetIANATimeZoneDateTimeParts: (epochNanoseconds, id) => {
        const { epochMilliseconds, millisecond, microsecond, nanosecond } = ES.GetISOPartsFromEpoch(epochNanoseconds);
        const { year, month, day, hour, minute, second } = ES.GetFormatterParts(id, epochMilliseconds);
        return ES.BalanceISODateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
      },
      GetIANATimeZoneNextTransition: (epochNanoseconds, id) => {
        const uppercap = ES.SystemUTCEpochNanoSeconds().plus(DAY_NANOS.multiply(366));
        let leftNanos = epochNanoseconds;
        let leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
        let rightNanos = leftNanos;
        let rightOffsetNs = leftOffsetNs;
        while (leftOffsetNs === rightOffsetNs && bigInt(leftNanos).compare(uppercap) === -1) {
          rightNanos = bigInt(leftNanos).plus(DAY_NANOS.multiply(2 * 7));
          rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
          if (leftOffsetNs === rightOffsetNs) {
            leftNanos = rightNanos;
          }
        }
        if (leftOffsetNs === rightOffsetNs) return null;
        const result = bisect(
          (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
          leftNanos,
          rightNanos,
          leftOffsetNs,
          rightOffsetNs
        );
        return result;
      },
      GetIANATimeZonePreviousTransition: (epochNanoseconds, id) => {
        const lowercap = BEFORE_FIRST_DST; // 1847-01-01T00:00:00Z
        let rightNanos = bigInt(epochNanoseconds).minus(1);
        let rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
        let leftNanos = rightNanos;
        let leftOffsetNs = rightOffsetNs;
        while (rightOffsetNs === leftOffsetNs && bigInt(rightNanos).compare(lowercap) === 1) {
          leftNanos = bigInt(rightNanos).minus(DAY_NANOS.multiply(2 * 7));
          leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
          if (rightOffsetNs === leftOffsetNs) {
            rightNanos = leftNanos;
          }
        }
        if (rightOffsetNs === leftOffsetNs) return null;
        const result = bisect(
          (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
          leftNanos,
          rightNanos,
          leftOffsetNs,
          rightOffsetNs
        );
        return result;
      },
      GetFormatterParts: (timeZone, epochMilliseconds) => {
        const formatter = getIntlDateTimeFormatEnUsForTimeZone(timeZone);
        // FIXME: can this use formatToParts instead?
        const datetime = formatter.format(new Date(epochMilliseconds));
        const [date, fullYear, time] = datetime.split(/,\s+/);
        const [month, day] = date.split(' ');
        const [year, era] = fullYear.split(' ');
        const [hour, minute, second] = time.split(':');
        return {
          year: era === 'BC' ? -year + 1 : +year,
          month: +month,
          day: +day,
          hour: hour === '24' ? 0 : +hour, // bugs.chromium.org/p/chromium/issues/detail?id=1045791
          minute: +minute,
          second: +second
        };
      },
      GetIANATimeZoneEpochValue: (id, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        let ns = ES.GetEpochFromISOParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
        if (ns === null) throw new RangeError('DateTime outside of supported range');
        let nsEarlier = ns.minus(DAY_NANOS);
        if (nsEarlier.lesser(NS_MIN)) nsEarlier = ns;
        let nsLater = ns.plus(DAY_NANOS);
        if (nsLater.greater(NS_MAX)) nsLater = ns;
        const earliest = ES.GetIANATimeZoneOffsetNanoseconds(nsEarlier, id);
        const latest = ES.GetIANATimeZoneOffsetNanoseconds(nsLater, id);
        const found = earliest === latest ? [earliest] : [earliest, latest];
        return found
          .map((offsetNanoseconds) => {
            const epochNanoseconds = bigInt(ns).minus(offsetNanoseconds);
            const parts = ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
            if (
              year !== parts.year ||
              month !== parts.month ||
              day !== parts.day ||
              hour !== parts.hour ||
              minute !== parts.minute ||
              second !== parts.second ||
              millisecond !== parts.millisecond ||
              microsecond !== parts.microsecond ||
              nanosecond !== parts.nanosecond
            ) {
              return undefined;
            }
            return epochNanoseconds;
          })
          .filter((x) => x !== undefined);
      },
      LeapYear: (year) => {
        if (undefined === year) return false;
        const isDiv4 = year % 4 === 0;
        const isDiv100 = year % 100 === 0;
        const isDiv400 = year % 400 === 0;
        return isDiv4 && (!isDiv100 || isDiv400);
      },
      ISODaysInMonth: (year, month) => {
        const DoM = {
          standard: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
          leapyear: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        };
        return DoM[ES.LeapYear(year) ? 'leapyear' : 'standard'][month - 1];
      },
      DayOfWeek: (year, month, day) => {
        const m = month + (month < 3 ? 10 : -2);
        const Y = year - (month < 3 ? 1 : 0);

        const c = MathFloor(Y / 100);
        const y = Y - c * 100;
        const d = day;

        const pD = d;
        const pM = MathFloor(2.6 * m - 0.2);
        const pY = y + MathFloor(y / 4);
        const pC = MathFloor(c / 4) - 2 * c;

        const dow = (pD + pM + pY + pC) % 7;

        return dow + (dow <= 0 ? 7 : 0);
      },
      DayOfYear: (year, month, day) => {
        let days = day;
        for (let m = month - 1; m > 0; m--) {
          days += ES.ISODaysInMonth(year, m);
        }
        return days;
      },
      WeekOfYear: (year, month, day) => {
        let doy = ES.DayOfYear(year, month, day);
        let dow = ES.DayOfWeek(year, month, day) || 7;
        let doj = ES.DayOfWeek(year, 1, 1);

        const week = MathFloor((doy - dow + 10) / 7);

        if (week < 1) {
          if (doj === 5 || (doj === 6 && ES.LeapYear(year - 1))) {
            return 53;
          } else {
            return 52;
          }
        }
        if (week === 53) {
          if ((ES.LeapYear(year) ? 366 : 365) - doy < 4 - dow) {
            return 1;
          }
        }

        return week;
      },
      DurationSign: (y, mon, w, d, h, min, s, ms, µs, ns) => {
        for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
          if (prop !== 0) return prop < 0 ? -1 : 1;
        }
        return 0;
      },

      BalanceISOYearMonth: (year, month) => {
        if (!NumberIsFinite(year) || !NumberIsFinite(month)) throw new RangeError('infinity is out of range');
        month -= 1;
        year += MathFloor(month / 12);
        month %= 12;
        if (month < 0) month += 12;
        month += 1;
        return { year, month };
      },
      BalanceISODate: (year, month, day) => {
        if (!NumberIsFinite(day)) throw new RangeError('infinity is out of range');
        ({ year, month } = ES.BalanceISOYearMonth(year, month));
        let daysInYear = 0;
        let testYear = month > 2 ? year : year - 1;
        while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day < -daysInYear)) {
          year -= 1;
          testYear -= 1;
          day += daysInYear;
        }
        testYear += 1;
        while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day > daysInYear)) {
          year += 1;
          testYear += 1;
          day -= daysInYear;
        }

        while (day < 1) {
          ({ year, month } = ES.BalanceISOYearMonth(year, month - 1));
          day += ES.ISODaysInMonth(year, month);
        }
        while (day > ES.ISODaysInMonth(year, month)) {
          day -= ES.ISODaysInMonth(year, month);
          ({ year, month } = ES.BalanceISOYearMonth(year, month + 1));
        }

        return { year, month, day };
      },
      BalanceISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        let deltaDays;
        ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        ({ year, month, day } = ES.BalanceISODate(year, month, day + deltaDays));
        return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      BalanceTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
        if (
          !NumberIsFinite(hour) ||
          !NumberIsFinite(minute) ||
          !NumberIsFinite(second) ||
          !NumberIsFinite(millisecond) ||
          !NumberIsFinite(microsecond) ||
          !NumberIsFinite(nanosecond)
        ) {
          throw new RangeError('infinity is out of range');
        }

        microsecond += MathFloor(nanosecond / 1000);
        nanosecond = ES.NonNegativeModulo(nanosecond, 1000);

        millisecond += MathFloor(microsecond / 1000);
        microsecond = ES.NonNegativeModulo(microsecond, 1000);

        second += MathFloor(millisecond / 1000);
        millisecond = ES.NonNegativeModulo(millisecond, 1000);

        minute += MathFloor(second / 60);
        second = ES.NonNegativeModulo(second, 60);

        hour += MathFloor(minute / 60);
        minute = ES.NonNegativeModulo(minute, 60);

        let deltaDays = MathFloor(hour / 24);
        hour = ES.NonNegativeModulo(hour, 24);

        return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      TotalDurationNanoseconds: (days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, offsetShift) => {
        if (days !== 0) nanoseconds = bigInt(nanoseconds).subtract(offsetShift);
        hours = bigInt(hours).add(bigInt(days).multiply(24));
        minutes = bigInt(minutes).add(hours.multiply(60));
        seconds = bigInt(seconds).add(minutes.multiply(60));
        milliseconds = bigInt(milliseconds).add(seconds.multiply(1000));
        microseconds = bigInt(microseconds).add(milliseconds.multiply(1000));
        return bigInt(nanoseconds).add(microseconds.multiply(1000));
      },
      NanosecondsToDays: (nanoseconds, relativeTo) => {
        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        const sign = MathSign(nanoseconds);
        nanoseconds = bigInt(nanoseconds);
        let dayLengthNs = 86400e9;
        if (sign === 0) return { days: 0, nanoseconds: bigInt.zero, dayLengthNs };
        if (!ES.IsTemporalZonedDateTime(relativeTo)) {
          let days;
          ({ quotient: days, remainder: nanoseconds } = nanoseconds.divmod(dayLengthNs));
          days = days.toJSNumber();
          return { days, nanoseconds, dayLengthNs };
        }

        const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
        const start = GetSlot(relativeTo, INSTANT);
        const endNs = startNs.add(nanoseconds);
        const end = new TemporalInstant(endNs);
        const timeZone = GetSlot(relativeTo, TIME_ZONE);
        const calendar = GetSlot(relativeTo, CALENDAR);

        // Find the difference in days only.
        const dtStart = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, start, calendar);
        const dtEnd = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, end, calendar);
        let { days } = ES.DifferenceISODateTime(
          GetSlot(dtStart, ISO_YEAR),
          GetSlot(dtStart, ISO_MONTH),
          GetSlot(dtStart, ISO_DAY),
          GetSlot(dtStart, ISO_HOUR),
          GetSlot(dtStart, ISO_MINUTE),
          GetSlot(dtStart, ISO_SECOND),
          GetSlot(dtStart, ISO_MILLISECOND),
          GetSlot(dtStart, ISO_MICROSECOND),
          GetSlot(dtStart, ISO_NANOSECOND),
          GetSlot(dtEnd, ISO_YEAR),
          GetSlot(dtEnd, ISO_MONTH),
          GetSlot(dtEnd, ISO_DAY),
          GetSlot(dtEnd, ISO_HOUR),
          GetSlot(dtEnd, ISO_MINUTE),
          GetSlot(dtEnd, ISO_SECOND),
          GetSlot(dtEnd, ISO_MILLISECOND),
          GetSlot(dtEnd, ISO_MICROSECOND),
          GetSlot(dtEnd, ISO_NANOSECOND),
          calendar,
          'day'
        );
        let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
        // may disambiguate

        // If clock time after addition was in the middle of a skipped period, the
        // endpoint was disambiguated to a later clock time. So it's possible that
        // the resulting disambiguated result is later than endNs. If so, then back
        // up one day and try again. Repeat if necessary (some transitions are
        // > 24 hours) until either there's zero days left or the date duration is
        // back inside the period where it belongs. Note that this case only can
        // happen for positive durations because the only direction that
        // `disambiguation: 'compatible'` can change clock time is forwards.
        if (sign === 1) {
          while (days > 0 && intermediateNs.greater(endNs)) {
            --days;
            intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
            // may do disambiguation
          }
        }
        nanoseconds = endNs.subtract(intermediateNs);

        let isOverflow = false;
        let relativeInstant = new TemporalInstant(intermediateNs);
        do {
          // calculate length of the next day (day that contains the time remainder)
          const oneDayFartherNs = ES.AddZonedDateTime(relativeInstant, timeZone, calendar, 0, 0, 0, sign, 0, 0, 0, 0, 0, 0);
          const relativeNs = GetSlot(relativeInstant, EPOCHNANOSECONDS);
          dayLengthNs = oneDayFartherNs.subtract(relativeNs).toJSNumber();
          isOverflow = nanoseconds.subtract(dayLengthNs).multiply(sign).geq(0);
          if (isOverflow) {
            nanoseconds = nanoseconds.subtract(dayLengthNs);
            relativeInstant = new TemporalInstant(oneDayFartherNs);
            days += sign;
          }
        } while (isOverflow);
        return { days, nanoseconds, dayLengthNs: MathAbs(dayLengthNs) };
      },
      BalanceDuration: (
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        largestUnit,
        relativeTo = undefined
      ) => {
        if (ES.IsTemporalZonedDateTime(relativeTo)) {
          const endNs = ES.AddZonedDateTime(
            GetSlot(relativeTo, INSTANT),
            GetSlot(relativeTo, TIME_ZONE),
            GetSlot(relativeTo, CALENDAR),
            0,
            0,
            0,
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds
          );
          const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
          nanoseconds = endNs.subtract(startNs);
        } else {
          nanoseconds = ES.TotalDurationNanoseconds(
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            0
          );
        }
        if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week' || largestUnit === 'day') {
          ({ days, nanoseconds } = ES.NanosecondsToDays(nanoseconds, relativeTo));
        } else {
          days = 0;
        }

        const sign = nanoseconds.lesser(0) ? -1 : 1;
        nanoseconds = nanoseconds.abs();
        microseconds = milliseconds = seconds = minutes = hours = bigInt.zero;

        switch (largestUnit) {
          case 'year':
          case 'month':
          case 'week':
          case 'day':
          case 'hour':
            ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
            ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
            ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
            ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
            ({ quotient: hours, remainder: minutes } = minutes.divmod(60));
            break;
          case 'minute':
            ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
            ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
            ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
            ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
            break;
          case 'second':
            ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
            ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
            ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
            break;
          case 'millisecond':
            ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
            ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
            break;
          case 'microsecond':
            ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
            break;
          case 'nanosecond':
            break;
          default:
            throw new Error('assert not reached');
        }

        hours = hours.toJSNumber() * sign;
        minutes = minutes.toJSNumber() * sign;
        seconds = seconds.toJSNumber() * sign;
        milliseconds = milliseconds.toJSNumber() * sign;
        microseconds = microseconds.toJSNumber() * sign;
        nanoseconds = nanoseconds.toJSNumber() * sign;

        return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      UnbalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);

        let calendar;
        if (relativeTo) {
          relativeTo = ES.ToTemporalDate(relativeTo);
          calendar = GetSlot(relativeTo, CALENDAR);
        }

        const oneYear = new TemporalDuration(sign);
        const oneMonth = new TemporalDuration(0, sign);
        const oneWeek = new TemporalDuration(0, 0, sign);

        switch (largestUnit) {
          case 'year':
            // no-op
            break;
          case 'month':
            {
              if (!calendar) throw new RangeError('a starting point is required for months balancing');
              // balance years down to months
              const dateAdd = ES.GetMethod(calendar, 'dateAdd');
              const dateUntil = ES.GetMethod(calendar, 'dateUntil');
              while (MathAbs(years) > 0) {
                const addOptions = ObjectCreate$7(null);
                const newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
                const untilOptions = ObjectCreate$7(null);
                untilOptions.largestUnit = 'month';
                const untilResult = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
                const oneYearMonths = GetSlot(untilResult, MONTHS);
                relativeTo = newRelativeTo;
                months += oneYearMonths;
                years -= sign;
              }
            }
            break;
          case 'week':
            if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
            // balance years down to days
            while (MathAbs(years) > 0) {
              let oneYearDays;
              ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
              days += oneYearDays;
              years -= sign;
            }

            // balance months down to days
            while (MathAbs(months) > 0) {
              let oneMonthDays;
              ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
              days += oneMonthDays;
              months -= sign;
            }
            break;
          default:
            // balance years down to days
            while (MathAbs(years) > 0) {
              if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
              let oneYearDays;
              ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
              days += oneYearDays;
              years -= sign;
            }

            // balance months down to days
            while (MathAbs(months) > 0) {
              if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
              let oneMonthDays;
              ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
              days += oneMonthDays;
              months -= sign;
            }

            // balance weeks down to days
            while (MathAbs(weeks) > 0) {
              if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
              let oneWeekDays;
              ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
              days += oneWeekDays;
              weeks -= sign;
            }
            break;
        }

        return { years, months, weeks, days };
      },
      BalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
        if (sign === 0) return { years, months, weeks, days };

        let calendar;
        if (relativeTo) {
          relativeTo = ES.ToTemporalDate(relativeTo);
          calendar = GetSlot(relativeTo, CALENDAR);
        }

        const oneYear = new TemporalDuration(sign);
        const oneMonth = new TemporalDuration(0, sign);
        const oneWeek = new TemporalDuration(0, 0, sign);

        switch (largestUnit) {
          case 'year': {
            if (!calendar) throw new RangeError('a starting point is required for years balancing');
            // balance days up to years
            let newRelativeTo, oneYearDays;
            ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
            while (MathAbs(days) >= MathAbs(oneYearDays)) {
              days -= oneYearDays;
              years += sign;
              relativeTo = newRelativeTo;
              ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
            }

            // balance days up to months
            let oneMonthDays;
            ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            while (MathAbs(days) >= MathAbs(oneMonthDays)) {
              days -= oneMonthDays;
              months += sign;
              relativeTo = newRelativeTo;
              ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            }

            // balance months up to years
            const dateAdd = ES.GetMethod(calendar, 'dateAdd');
            const addOptions = ObjectCreate$7(null);
            newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
            const dateUntil = ES.GetMethod(calendar, 'dateUntil');
            const untilOptions = ObjectCreate$7(null);
            untilOptions.largestUnit = 'month';
            let untilResult = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
            let oneYearMonths = GetSlot(untilResult, MONTHS);
            while (MathAbs(months) >= MathAbs(oneYearMonths)) {
              months -= oneYearMonths;
              years += sign;
              relativeTo = newRelativeTo;
              const addOptions = ObjectCreate$7(null);
              newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
              const untilOptions = ObjectCreate$7(null);
              untilOptions.largestUnit = 'month';
              untilResult = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
              oneYearMonths = GetSlot(untilResult, MONTHS);
            }
            break;
          }
          case 'month': {
            if (!calendar) throw new RangeError('a starting point is required for months balancing');
            // balance days up to months
            let newRelativeTo, oneMonthDays;
            ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            while (MathAbs(days) >= MathAbs(oneMonthDays)) {
              days -= oneMonthDays;
              months += sign;
              relativeTo = newRelativeTo;
              ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            }
            break;
          }
          case 'week': {
            if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
            // balance days up to weeks
            let newRelativeTo, oneWeekDays;
            ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
            while (MathAbs(days) >= MathAbs(oneWeekDays)) {
              days -= oneWeekDays;
              weeks += sign;
              relativeTo = newRelativeTo;
              ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
            }
            break;
          }
        }

        return { years, months, weeks, days };
      },
      CalculateOffsetShift: (relativeTo, y, mon, w, d, h, min, s, ms, µs, ns) => {
        if (ES.IsTemporalZonedDateTime(relativeTo)) {
          const instant = GetSlot(relativeTo, INSTANT);
          const timeZone = GetSlot(relativeTo, TIME_ZONE);
          const calendar = GetSlot(relativeTo, CALENDAR);
          const offsetBefore = ES.GetOffsetNanosecondsFor(timeZone, instant);
          const after = ES.AddZonedDateTime(instant, timeZone, calendar, y, mon, w, d, h, min, s, ms, µs, ns);
          const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
          const instantAfter = new TemporalInstant(after);
          const offsetAfter = ES.GetOffsetNanosecondsFor(timeZone, instantAfter);
          return offsetAfter - offsetBefore;
        }
        return 0;
      },
      CreateNegatedTemporalDuration: (duration) => {
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        return new TemporalDuration(
          -GetSlot(duration, YEARS),
          -GetSlot(duration, MONTHS),
          -GetSlot(duration, WEEKS),
          -GetSlot(duration, DAYS),
          -GetSlot(duration, HOURS),
          -GetSlot(duration, MINUTES),
          -GetSlot(duration, SECONDS),
          -GetSlot(duration, MILLISECONDS),
          -GetSlot(duration, MICROSECONDS),
          -GetSlot(duration, NANOSECONDS)
        );
      },

      ConstrainToRange: (value, min, max) => MathMin(max, MathMax(min, value)),
      ConstrainISODate: (year, month, day) => {
        month = ES.ConstrainToRange(month, 1, 12);
        day = ES.ConstrainToRange(day, 1, ES.ISODaysInMonth(year, month));
        return { year, month, day };
      },
      ConstrainTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
        hour = ES.ConstrainToRange(hour, 0, 23);
        minute = ES.ConstrainToRange(minute, 0, 59);
        second = ES.ConstrainToRange(second, 0, 59);
        millisecond = ES.ConstrainToRange(millisecond, 0, 999);
        microsecond = ES.ConstrainToRange(microsecond, 0, 999);
        nanosecond = ES.ConstrainToRange(nanosecond, 0, 999);
        return { hour, minute, second, millisecond, microsecond, nanosecond };
      },
      ConstrainISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        ({ year, month, day } = ES.ConstrainISODate(year, month, day));
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },

      RejectToRange: (value, min, max) => {
        if (value < min || value > max) throw new RangeError(`value out of range: ${min} <= ${value} <= ${max}`);
      },
      RejectISODate: (year, month, day) => {
        ES.RejectToRange(month, 1, 12);
        ES.RejectToRange(day, 1, ES.ISODaysInMonth(year, month));
      },
      RejectDateRange: (year, month, day) => {
        // Noon avoids trouble at edges of DateTime range (excludes midnight)
        ES.RejectDateTimeRange(year, month, day, 12, 0, 0, 0, 0, 0);
      },
      RejectTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
        ES.RejectToRange(hour, 0, 23);
        ES.RejectToRange(minute, 0, 59);
        ES.RejectToRange(second, 0, 59);
        ES.RejectToRange(millisecond, 0, 999);
        ES.RejectToRange(microsecond, 0, 999);
        ES.RejectToRange(nanosecond, 0, 999);
      },
      RejectDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        ES.RejectISODate(year, month, day);
        ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
      },
      RejectDateTimeRange: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
        ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
        // Reject any DateTime 24 hours or more outside the Instant range
        if (
          (year === YEAR_MIN &&
            null ==
              ES.GetEpochFromISOParts(
                year,
                month,
                day + 1,
                hour,
                minute,
                second,
                millisecond,
                microsecond,
                nanosecond - 1
              )) ||
          (year === YEAR_MAX &&
            null ==
              ES.GetEpochFromISOParts(year, month, day - 1, hour, minute, second, millisecond, microsecond, nanosecond + 1))
        ) {
          throw new RangeError('DateTime outside of supported range');
        }
      },
      ValidateEpochNanoseconds: (epochNanoseconds) => {
        if (epochNanoseconds.lesser(NS_MIN) || epochNanoseconds.greater(NS_MAX)) {
          throw new RangeError('Instant outside of supported range');
        }
      },
      RejectYearMonthRange: (year, month) => {
        ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
        if (year === YEAR_MIN) {
          ES.RejectToRange(month, 4, 12);
        } else if (year === YEAR_MAX) {
          ES.RejectToRange(month, 1, 9);
        }
      },
      RejectDuration: (y, mon, w, d, h, min, s, ms, µs, ns) => {
        const sign = ES.DurationSign(y, mon, w, d, h, min, s, ms, µs, ns);
        for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
          if (!NumberIsFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
          const propSign = MathSign(prop);
          if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
        }
      },

      DifferenceISODate: (y1, m1, d1, y2, m2, d2, largestUnit = 'days') => {
        switch (largestUnit) {
          case 'year':
          case 'month': {
            const sign = -ES.CompareISODate(y1, m1, d1, y2, m2, d2);
            if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };

            const start = { year: y1, month: m1, day: d1 };
            const end = { year: y2, month: m2, day: d2 };

            let years = end.year - start.year;
            let mid = ES.AddISODate(y1, m1, d1, years, 0, 0, 0, 'constrain');
            let midSign = -ES.CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
            if (midSign === 0) {
              return largestUnit === 'year'
                ? { years, months: 0, weeks: 0, days: 0 }
                : { years: 0, months: years * 12, weeks: 0, days: 0 };
            }
            let months = end.month - start.month;
            if (midSign !== sign) {
              years -= sign;
              months += sign * 12;
            }
            mid = ES.AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
            midSign = -ES.CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
            if (midSign === 0) {
              return largestUnit === 'year'
                ? { years, months, weeks: 0, days: 0 }
                : { years: 0, months: months + years * 12, weeks: 0, days: 0 };
            }
            if (midSign !== sign) {
              // The end date is later in the month than mid date (or earlier for
              // negative durations). Back up one month.
              months -= sign;
              if (months === -sign) {
                years -= sign;
                months = 11 * sign;
              }
              mid = ES.AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
              midSign = -ES.CompareISODate(y1, m1, d1, mid.year, mid.month, mid.day);
            }

            let days = 0;
            // If we get here, months and years are correct (no overflow), and `mid`
            // is within the range from `start` to `end`. To count the days between
            // `mid` and `end`, there are 3 cases:
            // 1) same month: use simple subtraction
            // 2) end is previous month from intermediate (negative duration)
            // 3) end is next month from intermediate (positive duration)
            if (mid.month === end.month) {
              // 1) same month: use simple subtraction
              days = end.day - mid.day;
            } else if (sign < 0) {
              // 2) end is previous month from intermediate (negative duration)
              // Example: intermediate: Feb 1, end: Jan 30, DaysInMonth = 31, days = -2
              days = -mid.day - (ES.ISODaysInMonth(end.year, end.month) - end.day);
            } else {
              // 3) end is next month from intermediate (positive duration)
              // Example: intermediate: Jan 29, end: Feb 1, DaysInMonth = 31, days = 3
              days = end.day + (ES.ISODaysInMonth(mid.year, mid.month) - mid.day);
            }

            if (largestUnit === 'month') {
              months += years * 12;
              years = 0;
            }
            return { years, months, weeks: 0, days };
          }
          case 'week':
          case 'day': {
            let larger, smaller, sign;
            if (ES.CompareISODate(y1, m1, d1, y2, m2, d2) < 0) {
              smaller = { year: y1, month: m1, day: d1 };
              larger = { year: y2, month: m2, day: d2 };
              sign = 1;
            } else {
              smaller = { year: y2, month: m2, day: d2 };
              larger = { year: y1, month: m1, day: d1 };
              sign = -1;
            }
            let days =
              ES.DayOfYear(larger.year, larger.month, larger.day) - ES.DayOfYear(smaller.year, smaller.month, smaller.day);
            for (let year = smaller.year; year < larger.year; ++year) {
              days += ES.LeapYear(year) ? 366 : 365;
            }
            let weeks = 0;
            if (largestUnit === 'week') {
              weeks = MathFloor(days / 7);
              days %= 7;
            }
            weeks *= sign;
            days *= sign;
            return { years: 0, months: 0, weeks, days };
          }
          default:
            throw new Error('assert not reached');
        }
      },
      DifferenceTime: (h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2) => {
        let hours = h2 - h1;
        let minutes = min2 - min1;
        let seconds = s2 - s1;
        let milliseconds = ms2 - ms1;
        let microseconds = µs2 - µs1;
        let nanoseconds = ns2 - ns1;

        const sign = ES.DurationSign(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
        hours *= sign;
        minutes *= sign;
        seconds *= sign;
        milliseconds *= sign;
        microseconds *= sign;
        nanoseconds *= sign;

        let deltaDays = 0;
        ({
          deltaDays,
          hour: hours,
          minute: minutes,
          second: seconds,
          millisecond: milliseconds,
          microsecond: microseconds,
          nanosecond: nanoseconds
        } = ES.BalanceTime(hours, minutes, seconds, milliseconds, microseconds, nanoseconds));

        deltaDays *= sign;
        hours *= sign;
        minutes *= sign;
        seconds *= sign;
        milliseconds *= sign;
        microseconds *= sign;
        nanoseconds *= sign;

        return { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      DifferenceInstant(ns1, ns2, increment, unit, roundingMode) {
        const diff = ns2.minus(ns1);

        const remainder = diff.mod(86400e9);
        const wholeDays = diff.minus(remainder);
        const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
        const roundedDiff = wholeDays.plus(roundedRemainder);

        const nanoseconds = +roundedDiff.mod(1e3);
        const microseconds = +roundedDiff.divide(1e3).mod(1e3);
        const milliseconds = +roundedDiff.divide(1e6).mod(1e3);
        const seconds = +roundedDiff.divide(1e9);
        return { seconds, milliseconds, microseconds, nanoseconds };
      },
      DifferenceISODateTime: (
        y1,
        mon1,
        d1,
        h1,
        min1,
        s1,
        ms1,
        µs1,
        ns1,
        y2,
        mon2,
        d2,
        h2,
        min2,
        s2,
        ms2,
        µs2,
        ns2,
        calendar,
        largestUnit,
        options = ObjectCreate$7(null)
      ) => {
        let { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceTime(
          h1,
          min1,
          s1,
          ms1,
          µs1,
          ns1,
          h2,
          min2,
          s2,
          ms2,
          µs2,
          ns2
        );

        const timeSign = ES.DurationSign(
          0,
          0,
          0,
          deltaDays,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        );
        ({ year: y1, month: mon1, day: d1 } = ES.BalanceISODate(y1, mon1, d1 + deltaDays));
        const dateSign = ES.CompareISODate(y2, mon2, d2, y1, mon1, d1);
        if (dateSign === -timeSign) {
          ({ year: y1, month: mon1, day: d1 } = ES.BalanceISODate(y1, mon1, d1 - timeSign));
          ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            -timeSign,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            largestUnit
          ));
        }

        const date1 = ES.CreateTemporalDate(y1, mon1, d1, calendar);
        const date2 = ES.CreateTemporalDate(y2, mon2, d2, calendar);
        const dateLargestUnit = ES.LargerOfTwoTemporalUnits('day', largestUnit);
        const untilOptions = { ...options, largestUnit: dateLargestUnit };
        let { years, months, weeks, days } = ES.CalendarDateUntil(calendar, date1, date2, untilOptions);
        // Signs of date part and time part may not agree; balance them together
        ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      DifferenceZonedDateTime: (ns1, ns2, timeZone, calendar, largestUnit, options) => {
        const nsDiff = ns2.subtract(ns1);
        if (nsDiff.isZero()) {
          return {
            years: 0,
            months: 0,
            weeks: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
            microseconds: 0,
            nanoseconds: 0
          };
        }

        // Find the difference in dates only.
        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        const start = new TemporalInstant(ns1);
        const end = new TemporalInstant(ns2);
        const dtStart = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, start, calendar);
        const dtEnd = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, end, calendar);
        let { years, months, weeks, days } = ES.DifferenceISODateTime(
          GetSlot(dtStart, ISO_YEAR),
          GetSlot(dtStart, ISO_MONTH),
          GetSlot(dtStart, ISO_DAY),
          GetSlot(dtStart, ISO_HOUR),
          GetSlot(dtStart, ISO_MINUTE),
          GetSlot(dtStart, ISO_SECOND),
          GetSlot(dtStart, ISO_MILLISECOND),
          GetSlot(dtStart, ISO_MICROSECOND),
          GetSlot(dtStart, ISO_NANOSECOND),
          GetSlot(dtEnd, ISO_YEAR),
          GetSlot(dtEnd, ISO_MONTH),
          GetSlot(dtEnd, ISO_DAY),
          GetSlot(dtEnd, ISO_HOUR),
          GetSlot(dtEnd, ISO_MINUTE),
          GetSlot(dtEnd, ISO_SECOND),
          GetSlot(dtEnd, ISO_MILLISECOND),
          GetSlot(dtEnd, ISO_MICROSECOND),
          GetSlot(dtEnd, ISO_NANOSECOND),
          calendar,
          largestUnit,
          options
        );
        let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, years, months, weeks, 0, 0, 0, 0, 0, 0, 0);
        // may disambiguate
        let timeRemainderNs = ns2.subtract(intermediateNs);
        const intermediate = ES.CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
        ({ nanoseconds: timeRemainderNs, days } = ES.NanosecondsToDays(timeRemainderNs, intermediate));

        // Finally, merge the date and time durations and return the merged result.
        let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          0,
          0,
          0,
          0,
          0,
          timeRemainderNs,
          'hour'
        );
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      AddISODate: (year, month, day, years, months, weeks, days, overflow) => {
        year += years;
        month += months;
        ({ year, month } = ES.BalanceISOYearMonth(year, month));
        ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
        days += 7 * weeks;
        day += days;
        ({ year, month, day } = ES.BalanceISODate(year, month, day));
        return { year, month, day };
      },
      AddTime: (
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      ) => {
        hour += hours;
        minute += minutes;
        second += seconds;
        millisecond += milliseconds;
        microsecond += microseconds;
        nanosecond += nanoseconds;
        let deltaDays = 0;
        ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      SubtractDate: (year, month, day, years, months, weeks, days, overflow) => {
        days += 7 * weeks;
        day -= days;
        ({ year, month, day } = ES.BalanceISODate(year, month, day));
        month -= months;
        year -= years;
        ({ year, month } = ES.BalanceISOYearMonth(year, month));
        ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
        return { year, month, day };
      },
      AddDuration: (
        y1,
        mon1,
        w1,
        d1,
        h1,
        min1,
        s1,
        ms1,
        µs1,
        ns1,
        y2,
        mon2,
        w2,
        d2,
        h2,
        min2,
        s2,
        ms2,
        µs2,
        ns2,
        relativeTo
      ) => {
        const largestUnit1 = ES.DefaultTemporalLargestUnit(y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
        const largestUnit2 = ES.DefaultTemporalLargestUnit(y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
        const largestUnit = ES.LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);

        let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
        if (!relativeTo) {
          if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week') {
            throw new RangeError('relativeTo is required for years, months, or weeks arithmetic');
          }
          years = months = weeks = 0;
          ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            d1 + d2,
            h1 + h2,
            min1 + min2,
            s1 + s2,
            ms1 + ms2,
            µs1 + µs2,
            ns1 + ns2,
            largestUnit
          ));
        } else if (ES.IsTemporalDate(relativeTo)) {
          const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
          const calendar = GetSlot(relativeTo, CALENDAR);

          const dateDuration1 = new TemporalDuration(y1, mon1, w1, d1, 0, 0, 0, 0, 0, 0);
          const dateDuration2 = new TemporalDuration(y2, mon2, w2, d2, 0, 0, 0, 0, 0, 0);
          const dateAdd = ES.GetMethod(calendar, 'dateAdd');
          const firstAddOptions = ObjectCreate$7(null);
          const intermediate = ES.CalendarDateAdd(calendar, relativeTo, dateDuration1, firstAddOptions, dateAdd);
          const secondAddOptions = ObjectCreate$7(null);
          const end = ES.CalendarDateAdd(calendar, intermediate, dateDuration2, secondAddOptions, dateAdd);

          const dateLargestUnit = ES.LargerOfTwoTemporalUnits('day', largestUnit);
          const differenceOptions = ObjectCreate$7(null);
          differenceOptions.largestUnit = dateLargestUnit;
          ({ years, months, weeks, days } = ES.CalendarDateUntil(calendar, relativeTo, end, differenceOptions));
          // Signs of date part and time part may not agree; balance them together
          ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            days,
            h1 + h2,
            min1 + min2,
            s1 + s2,
            ms1 + ms2,
            µs1 + µs2,
            ns1 + ns2,
            largestUnit
          ));
        } else {
          // relativeTo is a ZonedDateTime
          const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
          const timeZone = GetSlot(relativeTo, TIME_ZONE);
          const calendar = GetSlot(relativeTo, CALENDAR);
          const intermediateNs = ES.AddZonedDateTime(
            GetSlot(relativeTo, INSTANT),
            timeZone,
            calendar,
            y1,
            mon1,
            w1,
            d1,
            h1,
            min1,
            s1,
            ms1,
            µs1,
            ns1
          );
          const endNs = ES.AddZonedDateTime(
            new TemporalInstant(intermediateNs),
            timeZone,
            calendar,
            y2,
            mon2,
            w2,
            d2,
            h2,
            min2,
            s2,
            ms2,
            µs2,
            ns2
          );
          if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
            // The user is only asking for a time difference, so return difference of instants.
            years = 0;
            months = 0;
            weeks = 0;
            days = 0;
            ({ seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
              GetSlot(relativeTo, EPOCHNANOSECONDS),
              endNs,
              1,
              'nanosecond',
              'halfExpand'
            ));
            ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
              0,
              0,
              0,
              seconds,
              milliseconds,
              microseconds,
              nanoseconds,
              largestUnit
            ));
          } else {
            ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
              ES.DifferenceZonedDateTime(GetSlot(relativeTo, EPOCHNANOSECONDS), endNs, timeZone, calendar, largestUnit));
          }
        }

        ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      AddInstant: (epochNanoseconds, h, min, s, ms, µs, ns) => {
        let sum = bigInt.zero;
        sum = sum.plus(bigInt(ns));
        sum = sum.plus(bigInt(µs).multiply(1e3));
        sum = sum.plus(bigInt(ms).multiply(1e6));
        sum = sum.plus(bigInt(s).multiply(1e9));
        sum = sum.plus(bigInt(min).multiply(60 * 1e9));
        sum = sum.plus(bigInt(h).multiply(60 * 60 * 1e9));

        const result = bigInt(epochNanoseconds).plus(sum);
        ES.ValidateEpochNanoseconds(result);
        return result;
      },
      AddDateTime: (
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar,
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        options
      ) => {
        // Add the time part
        let deltaDays = 0;
        ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        ));
        days += deltaDays;

        // Delegate the date part addition to the calendar
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        const datePart = ES.CreateTemporalDate(year, month, day, calendar);
        const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
        const addedDate = ES.CalendarDateAdd(calendar, datePart, dateDuration, options);

        return {
          year: GetSlot(addedDate, ISO_YEAR),
          month: GetSlot(addedDate, ISO_MONTH),
          day: GetSlot(addedDate, ISO_DAY),
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        };
      },
      AddZonedDateTime: (instant, timeZone, calendar, years, months, weeks, days, h, min, s, ms, µs, ns, options) => {
        // If only time is to be added, then use Instant math. It's not OK to fall
        // through to the date/time code below because compatible disambiguation in
        // the PlainDateTime=>Instant conversion will change the offset of any
        // ZonedDateTime in the repeated clock time after a backwards transition.
        // When adding/subtracting time units and not dates, this disambiguation is
        // not expected and so is avoided below via a fast path for time-only
        // arithmetic.
        // BTW, this behavior is similar in spirit to offset: 'prefer' in `with`.
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        if (ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0) === 0) {
          return ES.AddInstant(GetSlot(instant, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
        }

        // RFC 5545 requires the date portion to be added in calendar days and the
        // time portion to be added in exact time.
        let dt = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, instant, calendar);
        const datePart = ES.CreateTemporalDate(
          GetSlot(dt, ISO_YEAR),
          GetSlot(dt, ISO_MONTH),
          GetSlot(dt, ISO_DAY),
          calendar
        );
        const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
        const addedDate = ES.CalendarDateAdd(calendar, datePart, dateDuration, options);
        const dtIntermediate = ES.CreateTemporalDateTime(
          GetSlot(addedDate, ISO_YEAR),
          GetSlot(addedDate, ISO_MONTH),
          GetSlot(addedDate, ISO_DAY),
          GetSlot(dt, ISO_HOUR),
          GetSlot(dt, ISO_MINUTE),
          GetSlot(dt, ISO_SECOND),
          GetSlot(dt, ISO_MILLISECOND),
          GetSlot(dt, ISO_MICROSECOND),
          GetSlot(dt, ISO_NANOSECOND),
          calendar
        );

        // Note that 'compatible' is used below because this disambiguation behavior
        // is required by RFC 5545.
        const instantIntermediate = ES.BuiltinTimeZoneGetInstantFor(timeZone, dtIntermediate, 'compatible');
        return ES.AddInstant(GetSlot(instantIntermediate, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
      },
      RoundNumberToIncrement: (quantity, increment, mode) => {
        if (increment === 1) return quantity;
        let { quotient, remainder } = quantity.divmod(increment);
        if (remainder.equals(bigInt.zero)) return quantity;
        const sign = remainder.lt(bigInt.zero) ? -1 : 1;
        switch (mode) {
          case 'ceil':
            if (sign > 0) quotient = quotient.add(sign);
            break;
          case 'floor':
            if (sign < 0) quotient = quotient.add(sign);
            break;
          case 'trunc':
            // no change needed, because divmod is a truncation
            break;
          case 'halfExpand':
            // "half up away from zero"
            if (remainder.multiply(2).abs() >= increment) quotient = quotient.add(sign);
            break;
        }
        return quotient.multiply(increment);
      },
      RoundInstant: (epochNs, increment, unit, roundingMode) => {
        // Note: NonNegativeModulo, but with BigInt
        let remainder = epochNs.mod(86400e9);
        if (remainder.lesser(0)) remainder = remainder.plus(86400e9);
        const wholeDays = epochNs.minus(remainder);
        const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
        return wholeDays.plus(roundedRemainder);
      },
      RoundISODateTime: (
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        increment,
        unit,
        roundingMode,
        dayLengthNs = 86400e9
      ) => {
        let deltaDays = 0;
        ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          increment,
          unit,
          roundingMode,
          dayLengthNs
        ));
        ({ year, month, day } = ES.BalanceISODate(year, month, day + deltaDays));
        return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
      },
      RoundTime: (
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        increment,
        unit,
        roundingMode,
        dayLengthNs = 86400e9
      ) => {
        let quantity = bigInt.zero;
        switch (unit) {
          case 'day':
          case 'hour':
            quantity = bigInt(hour);
          // fall through
          case 'minute':
            quantity = quantity.multiply(60).plus(minute);
          // fall through
          case 'second':
            quantity = quantity.multiply(60).plus(second);
          // fall through
          case 'millisecond':
            quantity = quantity.multiply(1000).plus(millisecond);
          // fall through
          case 'microsecond':
            quantity = quantity.multiply(1000).plus(microsecond);
          // fall through
          case 'nanosecond':
            quantity = quantity.multiply(1000).plus(nanosecond);
        }
        const nsPerUnit = unit === 'day' ? dayLengthNs : nsPerTimeUnit[unit];
        const rounded = ES.RoundNumberToIncrement(quantity, nsPerUnit * increment, roundingMode);
        const result = rounded.divide(nsPerUnit).toJSNumber();
        switch (unit) {
          case 'day':
            return { deltaDays: result, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
          case 'hour':
            return ES.BalanceTime(result, 0, 0, 0, 0, 0);
          case 'minute':
            return ES.BalanceTime(hour, result, 0, 0, 0, 0);
          case 'second':
            return ES.BalanceTime(hour, minute, result, 0, 0, 0);
          case 'millisecond':
            return ES.BalanceTime(hour, minute, second, result, 0, 0);
          case 'microsecond':
            return ES.BalanceTime(hour, minute, second, millisecond, result, 0);
          case 'nanosecond':
            return ES.BalanceTime(hour, minute, second, millisecond, microsecond, result);
        }
      },
      DaysUntil: (earlier, later) => {
        return ES.DifferenceISODate(
          GetSlot(earlier, ISO_YEAR),
          GetSlot(earlier, ISO_MONTH),
          GetSlot(earlier, ISO_DAY),
          GetSlot(later, ISO_YEAR),
          GetSlot(later, ISO_MONTH),
          GetSlot(later, ISO_DAY),
          'day'
        ).days;
      },
      MoveRelativeDate: (calendar, relativeTo, duration) => {
        const options = ObjectCreate$7(null);
        const later = ES.CalendarDateAdd(calendar, relativeTo, duration, options);
        const days = ES.DaysUntil(relativeTo, later);
        return { relativeTo: later, days };
      },
      MoveRelativeZonedDateTime: (relativeTo, years, months, weeks, days) => {
        const timeZone = GetSlot(relativeTo, TIME_ZONE);
        const calendar = GetSlot(relativeTo, CALENDAR);
        const intermediateNs = ES.AddZonedDateTime(
          GetSlot(relativeTo, INSTANT),
          timeZone,
          calendar,
          years,
          months,
          weeks,
          days,
          0,
          0,
          0,
          0,
          0,
          0
        );
        return ES.CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
      },
      AdjustRoundedDurationDays: (
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        increment,
        unit,
        roundingMode,
        relativeTo
      ) => {
        if (
          !ES.IsTemporalZonedDateTime(relativeTo) ||
          unit === 'year' ||
          unit === 'month' ||
          unit === 'week' ||
          unit === 'day' ||
          (unit === 'nanosecond' && increment === 1)
        ) {
          return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
        }

        // There's one more round of rounding possible: if relativeTo is a
        // ZonedDateTime, the time units could have rounded up into enough hours
        // to exceed the day length. If this happens, grow the date part by a
        // single day and re-run exact time rounding on the smaller remainder. DO
        // NOT RECURSE, because once the extra hours are sucked up into the date
        // duration, there's no way for another full day to come from the next
        // round of rounding. And if it were possible (e.g. contrived calendar
        // with 30-minute-long "days") then it'd risk an infinite loop.
        let timeRemainderNs = ES.TotalDurationNanoseconds(
          0,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          0
        );
        const direction = MathSign(timeRemainderNs.toJSNumber());

        const timeZone = GetSlot(relativeTo, TIME_ZONE);
        const calendar = GetSlot(relativeTo, CALENDAR);
        const dayStart = ES.AddZonedDateTime(
          GetSlot(relativeTo, INSTANT),
          timeZone,
          calendar,
          years,
          months,
          weeks,
          days,
          0,
          0,
          0,
          0,
          0,
          0
        );
        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        const dayEnd = ES.AddZonedDateTime(
          new TemporalInstant(dayStart),
          timeZone,
          calendar,
          0,
          0,
          0,
          direction,
          0,
          0,
          0,
          0,
          0,
          0
        );
        const dayLengthNs = dayEnd.subtract(dayStart);

        if (timeRemainderNs.subtract(dayLengthNs).multiply(direction).geq(0)) {
          ({ years, months, weeks, days } = ES.AddDuration(
            years,
            months,
            weeks,
            days,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            direction,
            0,
            0,
            0,
            0,
            0,
            0,
            relativeTo
          ));
          timeRemainderNs = ES.RoundInstant(timeRemainderNs.subtract(dayLengthNs), increment, unit, roundingMode);
          ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            0,
            0,
            0,
            0,
            0,
            0,
            timeRemainderNs.toJSNumber(),
            'hour'
          ));
        }
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
      },
      RoundDuration: (
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        increment,
        unit,
        roundingMode,
        relativeTo = undefined
      ) => {
        const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
        let calendar, zdtRelative;
        if (relativeTo) {
          if (ES.IsTemporalZonedDateTime(relativeTo)) {
            zdtRelative = relativeTo;
            const pdt = ES.BuiltinTimeZoneGetPlainDateTimeFor(
              GetSlot(relativeTo, TIME_ZONE),
              GetSlot(relativeTo, INSTANT),
              GetSlot(relativeTo, CALENDAR)
            );
            relativeTo = ES.TemporalDateTimeToDate(pdt);
          } else if (!ES.IsTemporalDate(relativeTo)) {
            throw new TypeError('starting point must be PlainDate or ZonedDateTime');
          }
          calendar = GetSlot(relativeTo, CALENDAR);
        }

        // First convert time units up to days, if rounding to days or higher units.
        // If rounding relative to a ZonedDateTime, then some days may not be 24h.
        let dayLengthNs;
        if (unit === 'year' || unit === 'month' || unit === 'week' || unit === 'day') {
          nanoseconds = ES.TotalDurationNanoseconds(0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 0);
          let intermediate;
          if (zdtRelative) {
            intermediate = ES.MoveRelativeZonedDateTime(zdtRelative, years, months, weeks, days);
          }
          let deltaDays;
          ({ days: deltaDays, nanoseconds, dayLengthNs } = ES.NanosecondsToDays(nanoseconds, intermediate));
          days += deltaDays;
          hours = minutes = seconds = milliseconds = microseconds = 0;
        }

        let total;
        switch (unit) {
          case 'year': {
            if (!calendar) throw new RangeError('A starting point is required for years rounding');

            // convert months and weeks to days by calculating difference(
            // relativeTo + years, relativeTo + { years, months, weeks })
            const yearsDuration = new TemporalDuration(years);
            const dateAdd = ES.GetMethod(calendar, 'dateAdd');
            const firstAddOptions = ObjectCreate$7(null);
            const yearsLater = ES.CalendarDateAdd(calendar, relativeTo, yearsDuration, firstAddOptions, dateAdd);
            const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
            const secondAddOptions = ObjectCreate$7(null);
            const yearsMonthsWeeksLater = ES.CalendarDateAdd(
              calendar,
              relativeTo,
              yearsMonthsWeeks,
              secondAddOptions,
              dateAdd
            );
            const monthsWeeksInDays = ES.DaysUntil(yearsLater, yearsMonthsWeeksLater);
            relativeTo = yearsLater;
            days += monthsWeeksInDays;

            const thirdAddOptions = ObjectCreate$7(null);
            const daysLater = ES.CalendarDateAdd(calendar, relativeTo, { days }, thirdAddOptions, dateAdd);
            const untilOptions = ObjectCreate$7(null);
            untilOptions.largestUnit = 'year';
            const yearsPassed = ES.CalendarDateUntil(calendar, relativeTo, daysLater, untilOptions).years;
            years += yearsPassed;
            const oldRelativeTo = relativeTo;
            const fourthAddOptions = ObjectCreate$7(null);
            relativeTo = ES.CalendarDateAdd(calendar, relativeTo, { years: yearsPassed }, fourthAddOptions, dateAdd);
            const daysPassed = ES.DaysUntil(oldRelativeTo, relativeTo);
            days -= daysPassed;
            const oneYear = new TemporalDuration(days < 0 ? -1 : 1);
            let { days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear);

            // Note that `nanoseconds` below (here and in similar code for months,
            // weeks, and days further below) isn't actually nanoseconds for the
            // full date range.  Instead, it's a BigInt representation of total
            // days multiplied by the number of nanoseconds in the last day of
            // the duration. This lets us do days-or-larger rounding using BigInt
            // math which reduces precision loss.
            oneYearDays = MathAbs(oneYearDays);
            const divisor = bigInt(oneYearDays).multiply(dayLengthNs);
            nanoseconds = divisor.multiply(years).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor.multiply(increment).toJSNumber(), roundingMode);
            total = nanoseconds.toJSNumber() / divisor.toJSNumber();
            years = rounded.divide(divisor).toJSNumber();
            nanoseconds = months = weeks = days = 0;
            break;
          }
          case 'month': {
            if (!calendar) throw new RangeError('A starting point is required for months rounding');

            // convert weeks to days by calculating difference(relativeTo +
            //   { years, months }, relativeTo + { years, months, weeks })
            const yearsMonths = new TemporalDuration(years, months);
            const dateAdd = ES.GetMethod(calendar, 'dateAdd');
            const firstAddOptions = ObjectCreate$7(null);
            const yearsMonthsLater = ES.CalendarDateAdd(calendar, relativeTo, yearsMonths, firstAddOptions, dateAdd);
            const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
            const secondAddOptions = ObjectCreate$7(null);
            const yearsMonthsWeeksLater = ES.CalendarDateAdd(
              calendar,
              relativeTo,
              yearsMonthsWeeks,
              secondAddOptions,
              dateAdd
            );
            const weeksInDays = ES.DaysUntil(yearsMonthsLater, yearsMonthsWeeksLater);
            relativeTo = yearsMonthsLater;
            days += weeksInDays;

            // Months may be different lengths of days depending on the calendar,
            // convert days to months in a loop as described above under 'years'.
            const sign = MathSign(days);
            const oneMonth = new TemporalDuration(0, days < 0 ? -1 : 1);
            let oneMonthDays;
            ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            while (MathAbs(days) >= MathAbs(oneMonthDays)) {
              months += sign;
              days -= oneMonthDays;
              ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
            }
            oneMonthDays = MathAbs(oneMonthDays);
            const divisor = bigInt(oneMonthDays).multiply(dayLengthNs);
            nanoseconds = divisor.multiply(months).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor.multiply(increment).toJSNumber(), roundingMode);
            total = nanoseconds.toJSNumber() / divisor.toJSNumber();
            months = rounded.divide(divisor).toJSNumber();
            nanoseconds = weeks = days = 0;
            break;
          }
          case 'week': {
            if (!calendar) throw new RangeError('A starting point is required for weeks rounding');
            // Weeks may be different lengths of days depending on the calendar,
            // convert days to weeks in a loop as described above under 'years'.
            const sign = MathSign(days);
            const oneWeek = new TemporalDuration(0, 0, days < 0 ? -1 : 1);
            let oneWeekDays;
            ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
            while (MathAbs(days) >= MathAbs(oneWeekDays)) {
              weeks += sign;
              days -= oneWeekDays;
              ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
            }
            oneWeekDays = MathAbs(oneWeekDays);
            const divisor = bigInt(oneWeekDays).multiply(dayLengthNs);
            nanoseconds = divisor.multiply(weeks).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor.multiply(increment).toJSNumber(), roundingMode);
            total = nanoseconds.toJSNumber() / divisor.toJSNumber();
            weeks = rounded.divide(divisor).toJSNumber();
            nanoseconds = days = 0;
            break;
          }
          case 'day': {
            const divisor = bigInt(dayLengthNs);
            nanoseconds = divisor.multiply(days).plus(nanoseconds);
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor.multiply(increment).toJSNumber(), roundingMode);
            total = nanoseconds.toJSNumber() / divisor.toJSNumber();
            days = rounded.divide(divisor).toJSNumber();
            nanoseconds = 0;
            break;
          }
          case 'hour': {
            const divisor = 3600e9;
            nanoseconds = bigInt(hours)
              .multiply(3600e9)
              .plus(bigInt(minutes).multiply(60e9))
              .plus(bigInt(seconds).multiply(1e9))
              .plus(bigInt(milliseconds).multiply(1e6))
              .plus(bigInt(microseconds).multiply(1e3))
              .plus(nanoseconds);
            total = nanoseconds.toJSNumber() / divisor;
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
            hours = rounded.divide(divisor).toJSNumber();
            minutes = seconds = milliseconds = microseconds = nanoseconds = 0;
            break;
          }
          case 'minute': {
            const divisor = 60e9;
            nanoseconds = bigInt(minutes)
              .multiply(60e9)
              .plus(bigInt(seconds).multiply(1e9))
              .plus(bigInt(milliseconds).multiply(1e6))
              .plus(bigInt(microseconds).multiply(1e3))
              .plus(nanoseconds);
            total = nanoseconds.toJSNumber() / divisor;
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
            minutes = rounded.divide(divisor).toJSNumber();
            seconds = milliseconds = microseconds = nanoseconds = 0;
            break;
          }
          case 'second': {
            const divisor = 1e9;
            nanoseconds = bigInt(seconds)
              .multiply(1e9)
              .plus(bigInt(milliseconds).multiply(1e6))
              .plus(bigInt(microseconds).multiply(1e3))
              .plus(nanoseconds);
            total = nanoseconds.toJSNumber() / divisor;
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
            seconds = rounded.divide(divisor).toJSNumber();
            milliseconds = microseconds = nanoseconds = 0;
            break;
          }
          case 'millisecond': {
            const divisor = 1e6;
            nanoseconds = bigInt(milliseconds).multiply(1e6).plus(bigInt(microseconds).multiply(1e3)).plus(nanoseconds);
            total = nanoseconds.toJSNumber() / divisor;
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
            milliseconds = rounded.divide(divisor).toJSNumber();
            microseconds = nanoseconds = 0;
            break;
          }
          case 'microsecond': {
            const divisor = 1e3;
            nanoseconds = bigInt(microseconds).multiply(1e3).plus(nanoseconds);
            total = nanoseconds.toJSNumber() / divisor;
            const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
            microseconds = rounded.divide(divisor).toJSNumber();
            nanoseconds = 0;
            break;
          }
          case 'nanosecond': {
            total = nanoseconds;
            nanoseconds = ES.RoundNumberToIncrement(bigInt(nanoseconds), increment, roundingMode);
            break;
          }
        }
        return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, total };
      },

      CompareISODate: (y1, m1, d1, y2, m2, d2) => {
        for (const [x, y] of [
          [y1, y2],
          [m1, m2],
          [d1, d2]
        ]) {
          if (x !== y) return ES.ComparisonResult(x - y);
        }
        return 0;
      },

      AssertPositiveInteger: (num) => {
        if (!NumberIsFinite(num) || MathAbs(num) !== num) throw new RangeError(`invalid positive integer: ${num}`);
        return num;
      },
      NonNegativeModulo: (x, y) => {
        let result = x % y;
        if (ObjectIs(result, -0)) return 0;
        if (result < 0) result += y;
        return result;
      },
      ToBigInt: (arg) => {
        if (bigInt.isInstance(arg)) {
          return arg;
        }

        const prim = ES.ToPrimitive(arg, Number);
        switch (typeof prim) {
          case 'undefined':
          case 'object':
          case 'number':
          case 'symbol':
            throw new TypeError(`cannot convert ${typeof arg} to bigint`);
          case 'string':
            if (!prim.match(/^\s*(?:[+-]?\d+\s*)?$/)) {
              throw new SyntaxError('invalid BigInt syntax');
            }
          // eslint: no-fallthrough: false
          case 'bigint':
            try {
              return bigInt(prim);
            } catch (e) {
              if (e instanceof Error && e.message.startsWith('Invalid integer')) throw new SyntaxError(e.message);
              throw e;
            }
          case 'boolean':
            if (prim) {
              return bigInt(1);
            } else {
              return bigInt.zero;
            }
        }
      },

      // Note: This method returns values with bogus nanoseconds based on the previous iteration's
      // milliseconds. That way there is a guarantee that the full nanoseconds are always going to be
      // increasing at least and that the microsecond and nanosecond fields are likely to be non-zero.
      SystemUTCEpochNanoSeconds: (() => {
        let ns = Date.now() % 1e6;
        return () => {
          const ms = Date.now();
          const result = bigInt(ms).multiply(1e6).plus(ns);
          ns = ms % 1e6;
          return bigInt.min(NS_MAX, bigInt.max(NS_MIN, result));
        };
      })(),
      SystemTimeZone: () => {
        const fmt = new IntlDateTimeFormat$1('en-us');
        const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
        return new TemporalTimeZone(ES.ParseTemporalTimeZone(fmt.resolvedOptions().timeZone));
      },
      ComparisonResult: (value) => (value < 0 ? -1 : value > 0 ? 1 : value),
      GetOptionsObject: (options) => {
        if (options === undefined) return ObjectCreate$7(null);
        if (ES.Type(options) === 'Object') return options;
        throw new TypeError(
          `Options parameter must be an object, not ${options === null ? 'null' : `a ${typeof options}`}`
        );
      },
      GetOption: (options, property, allowedValues, fallback) => {
        let value = options[property];
        if (value !== undefined) {
          value = ES.ToString(value);
          if (!allowedValues.includes(value)) {
            throw new RangeError(`${property} must be one of ${allowedValues.join(', ')}, not ${value}`);
          }
          return value;
        }
        return fallback;
      },
      GetNumberOption: (options, property, minimum, maximum, fallback) => {
        let value = options[property];
        if (value === undefined) return fallback;
        value = ES.ToNumber(value);
        if (NumberIsNaN(value) || value < minimum || value > maximum) {
          throw new RangeError(`${property} must be between ${minimum} and ${maximum}, not ${value}`);
        }
        return MathFloor(value);
      }
    });

    const OFFSET = new RegExp(`^${offset.source}$`);

    function bisect(getState, left, right, lstate = getState(left), rstate = getState(right)) {
      left = bigInt(left);
      right = bigInt(right);
      while (right.minus(left).greater(1)) {
        let middle = left.plus(right).divide(2);
        const mstate = getState(middle);
        if (mstate === lstate) {
          left = middle;
          lstate = mstate;
        } else if (mstate === rstate) {
          right = middle;
          rstate = mstate;
        } else {
          throw new Error(`invalid state in bisection ${lstate} - ${mstate} - ${rstate}`);
        }
      }
      return right;
    }

    const nsPerTimeUnit = {
      hour: 3600e9,
      minute: 60e9,
      second: 1e9,
      millisecond: 1e6,
      microsecond: 1e3,
      nanosecond: 1
    };

    /* global false */

    class TimeZone {
      constructor(timeZoneIdentifier) {
        // Note: if the argument is not passed, GetCanonicalTimeZoneIdentifier(undefined) will throw.
        //       This check exists only to improve the error message.
        if (arguments.length < 1) {
          throw new RangeError('missing argument: identifier is required');
        }

        timeZoneIdentifier = ES.GetCanonicalTimeZoneIdentifier(timeZoneIdentifier);
        CreateSlots(this);
        SetSlot(this, TIMEZONE_ID, timeZoneIdentifier);
      }
      get id() {
        return ES.ToString(this);
      }
      getOffsetNanosecondsFor(instant) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        instant = ES.ToTemporalInstant(instant);
        const id = GetSlot(this, TIMEZONE_ID);

        const offsetNs = ES.ParseOffsetString(id);
        if (offsetNs !== null) return offsetNs;

        return ES.GetIANATimeZoneOffsetNanoseconds(GetSlot(instant, EPOCHNANOSECONDS), id);
      }
      getOffsetStringFor(instant) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        instant = ES.ToTemporalInstant(instant);
        return ES.BuiltinTimeZoneGetOffsetStringFor(this, instant);
      }
      getPlainDateTimeFor(instant, calendar = ES.GetISO8601Calendar()) {
        instant = ES.ToTemporalInstant(instant);
        calendar = ES.ToTemporalCalendar(calendar);
        return ES.BuiltinTimeZoneGetPlainDateTimeFor(this, instant, calendar);
      }
      getInstantFor(dateTime, options = undefined) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        dateTime = ES.ToTemporalDateTime(dateTime);
        options = ES.GetOptionsObject(options);
        const disambiguation = ES.ToTemporalDisambiguation(options);
        return ES.BuiltinTimeZoneGetInstantFor(this, dateTime, disambiguation);
      }
      getPossibleInstantsFor(dateTime) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        dateTime = ES.ToTemporalDateTime(dateTime);
        const Instant = GetIntrinsic('%Temporal.Instant%');
        const id = GetSlot(this, TIMEZONE_ID);

        const offsetNs = ES.ParseOffsetString(id);
        if (offsetNs !== null) {
          const epochNs = ES.GetEpochFromISOParts(
            GetSlot(dateTime, ISO_YEAR),
            GetSlot(dateTime, ISO_MONTH),
            GetSlot(dateTime, ISO_DAY),
            GetSlot(dateTime, ISO_HOUR),
            GetSlot(dateTime, ISO_MINUTE),
            GetSlot(dateTime, ISO_SECOND),
            GetSlot(dateTime, ISO_MILLISECOND),
            GetSlot(dateTime, ISO_MICROSECOND),
            GetSlot(dateTime, ISO_NANOSECOND)
          );
          if (epochNs === null) throw new RangeError('DateTime outside of supported range');
          return [new Instant(epochNs.minus(offsetNs))];
        }

        const possibleEpochNs = ES.GetIANATimeZoneEpochValue(
          id,
          GetSlot(dateTime, ISO_YEAR),
          GetSlot(dateTime, ISO_MONTH),
          GetSlot(dateTime, ISO_DAY),
          GetSlot(dateTime, ISO_HOUR),
          GetSlot(dateTime, ISO_MINUTE),
          GetSlot(dateTime, ISO_SECOND),
          GetSlot(dateTime, ISO_MILLISECOND),
          GetSlot(dateTime, ISO_MICROSECOND),
          GetSlot(dateTime, ISO_NANOSECOND)
        );
        return possibleEpochNs.map((ns) => new Instant(ns));
      }
      getNextTransition(startingPoint) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        startingPoint = ES.ToTemporalInstant(startingPoint);
        const id = GetSlot(this, TIMEZONE_ID);

        // Offset time zones or UTC have no transitions
        if (ES.ParseOffsetString(id) !== null || id === 'UTC') {
          return null;
        }

        let epochNanoseconds = GetSlot(startingPoint, EPOCHNANOSECONDS);
        const Instant = GetIntrinsic('%Temporal.Instant%');
        epochNanoseconds = ES.GetIANATimeZoneNextTransition(epochNanoseconds, id);
        return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
      }
      getPreviousTransition(startingPoint) {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        startingPoint = ES.ToTemporalInstant(startingPoint);
        const id = GetSlot(this, TIMEZONE_ID);

        // Offset time zones or UTC have no transitions
        if (ES.ParseOffsetString(id) !== null || id === 'UTC') {
          return null;
        }

        let epochNanoseconds = GetSlot(startingPoint, EPOCHNANOSECONDS);
        const Instant = GetIntrinsic('%Temporal.Instant%');
        epochNanoseconds = ES.GetIANATimeZonePreviousTransition(epochNanoseconds, id);
        return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
      }
      toString() {
        if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
        return String(GetSlot(this, TIMEZONE_ID));
      }
      toJSON() {
        return ES.ToString(this);
      }
      static from(item) {
        return ES.ToTemporalTimeZone(item);
      }
    }

    MakeIntrinsicClass(TimeZone, 'Temporal.TimeZone');
    DefineIntrinsic('Temporal.TimeZone.prototype.getOffsetNanosecondsFor', TimeZone.prototype.getOffsetNanosecondsFor);

    const DATE = Symbol('date');
    const YM = Symbol('ym');
    const MD = Symbol('md');
    const TIME = Symbol('time');
    const DATETIME = Symbol('datetime');
    const ZONED = Symbol('zoneddatetime');
    const INST = Symbol('instant');
    const ORIGINAL = Symbol('original');
    const TZ_RESOLVED = Symbol('timezone');
    const TZ_GIVEN = Symbol('timezone-id-given');
    const CAL_ID = Symbol('calendar-id');
    const LOCALE = Symbol('locale');
    const OPTIONS = Symbol('options');

    const descriptor = (value) => {
      return {
        value,
        enumerable: true,
        writable: false,
        configurable: true
      };
    };

    const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
    const ObjectAssign$1 = Object.assign;

    // Construction of built-in Intl.DateTimeFormat objects is sloooooow,
    // so we'll only create those instances when we need them.
    // See https://bugs.chromium.org/p/v8/issues/detail?id=6528
    function getPropLazy(obj, prop) {
      let val = obj[prop];
      if (typeof val === 'function') {
        val = new IntlDateTimeFormat(obj[LOCALE], val(obj[OPTIONS]));
        obj[prop] = val;
      }
      return val;
    }
    // Similarly, lazy-init TimeZone instances.
    function getResolvedTimeZoneLazy(obj) {
      let val = obj[TZ_RESOLVED];
      if (typeof val === 'string') {
        val = new TimeZone(val);
        obj[TZ_RESOLVED] = val;
      }
      return val;
    }

    function DateTimeFormat(locale = undefined, options = undefined) {
      if (!(this instanceof DateTimeFormat)) return new DateTimeFormat(locale, options);
      const hasOptions = typeof options !== 'undefined';
      options = hasOptions ? ObjectAssign$1({}, options) : {};
      const original = new IntlDateTimeFormat(locale, options);
      const ro = original.resolvedOptions();

      // DateTimeFormat instances are very expensive to create. Therefore, they will
      // be lazily created only when needed, using the locale and options provided.
      // But it's possible for callers to mutate those inputs before lazy creation
      // happens. For this reason, we clone the inputs instead of caching the
      // original objects. To avoid the complexity of deep cloning any inputs that
      // are themselves objects (e.g. the locales array, or options property values
      // that will be coerced to strings), we rely on `resolvedOptions()` to do the
      // coercion and cloning for us. Unfortunately, we can't just use the resolved
      // options as-is because our options-amending logic adds additional fields if
      // the user doesn't supply any unit fields like year, month, day, hour, etc.
      // Therefore, we limit the properties in the clone to properties that were
      // present in the original input.
      if (hasOptions) {
        const clonedResolved = ObjectAssign$1({}, ro);
        for (const prop in clonedResolved) {
          if (!ES.HasOwnProperty(options, prop)) delete clonedResolved[prop];
        }
        this[OPTIONS] = clonedResolved;
      } else {
        this[OPTIONS] = options;
      }

      this[TZ_GIVEN] = options.timeZone ? options.timeZone : null;
      this[LOCALE] = ro.locale;
      this[ORIGINAL] = original;
      this[TZ_RESOLVED] = ro.timeZone;
      this[CAL_ID] = ro.calendar;
      this[DATE] = dateAmend;
      this[YM] = yearMonthAmend;
      this[MD] = monthDayAmend;
      this[TIME] = timeAmend;
      this[DATETIME] = datetimeAmend;
      this[ZONED] = zonedDateTimeAmend;
      this[INST] = instantAmend;
    }

    DateTimeFormat.supportedLocalesOf = function (...args) {
      return IntlDateTimeFormat.supportedLocalesOf(...args);
    };

    const properties = {
      resolvedOptions: descriptor(resolvedOptions),
      format: descriptor(format),
      formatRange: descriptor(formatRange)
    };

    if ('formatToParts' in IntlDateTimeFormat.prototype) {
      properties.formatToParts = descriptor(formatToParts);
    }

    if ('formatRangeToParts' in IntlDateTimeFormat.prototype) {
      properties.formatRangeToParts = descriptor(formatRangeToParts);
    }

    DateTimeFormat.prototype = Object.create(IntlDateTimeFormat.prototype, properties);

    function resolvedOptions() {
      return this[ORIGINAL].resolvedOptions();
    }

    function adjustFormatterTimeZone(formatter, timeZone) {
      if (!timeZone) return formatter;
      const options = formatter.resolvedOptions();
      if (options.timeZone === timeZone) return formatter;
      return new IntlDateTimeFormat(options.locale, { ...options, timeZone });
    }

    function format(datetime, ...rest) {
      let { instant, formatter, timeZone } = extractOverrides(datetime, this);
      if (instant && formatter) {
        formatter = adjustFormatterTimeZone(formatter, timeZone);
        return formatter.format(instant.epochMilliseconds);
      }
      return this[ORIGINAL].format(datetime, ...rest);
    }

    function formatToParts(datetime, ...rest) {
      let { instant, formatter, timeZone } = extractOverrides(datetime, this);
      if (instant && formatter) {
        formatter = adjustFormatterTimeZone(formatter, timeZone);
        return formatter.formatToParts(instant.epochMilliseconds);
      }
      return this[ORIGINAL].formatToParts(datetime, ...rest);
    }

    function formatRange(a, b) {
      if (isTemporalObject(a) || isTemporalObject(b)) {
        if (!sameTemporalType(a, b)) {
          throw new TypeError('Intl.DateTimeFormat.formatRange accepts two values of the same type');
        }
        const { instant: aa, formatter: aformatter, timeZone: atz } = extractOverrides(a, this);
        const { instant: bb, formatter: bformatter, timeZone: btz } = extractOverrides(b, this);
        if (atz && btz && atz !== btz) {
          throw new RangeError('cannot format range between different time zones');
        }
        if (aa && bb && aformatter && bformatter && aformatter === bformatter) {
          const formatter = adjustFormatterTimeZone(aformatter, atz);
          return formatter.formatRange(aa.epochMilliseconds, bb.epochMilliseconds);
        }
      }
      return this[ORIGINAL].formatRange(a, b);
    }

    function formatRangeToParts(a, b) {
      if (isTemporalObject(a) || isTemporalObject(b)) {
        if (!sameTemporalType(a, b)) {
          throw new TypeError('Intl.DateTimeFormat.formatRangeToParts accepts two values of the same type');
        }
        const { instant: aa, formatter: aformatter, timeZone: atz } = extractOverrides(a, this);
        const { instant: bb, formatter: bformatter, timeZone: btz } = extractOverrides(b, this);
        if (atz && btz && atz !== btz) {
          throw new RangeError('cannot format range between different time zones');
        }
        if (aa && bb && aformatter && bformatter && aformatter === bformatter) {
          const formatter = adjustFormatterTimeZone(aformatter, atz);
          return formatter.formatRangeToParts(aa.epochMilliseconds, bb.epochMilliseconds);
        }
      }
      return this[ORIGINAL].formatRangeToParts(a, b);
    }

    function amend(options = {}, amended = {}) {
      options = ObjectAssign$1({}, options);
      for (let opt of [
        'year',
        'month',
        'day',
        'hour',
        'minute',
        'second',
        'weekday',
        'dayPeriod',
        'timeZoneName',
        'dateStyle',
        'timeStyle'
      ]) {
        options[opt] = opt in amended ? amended[opt] : options[opt];
        if (options[opt] === false || options[opt] === undefined) delete options[opt];
      }
      return options;
    }

    function timeAmend(options) {
      options = amend(options, {
        year: false,
        month: false,
        day: false,
        weekday: false,
        timeZoneName: false,
        dateStyle: false
      });
      if (!hasTimeOptions(options)) {
        options = ObjectAssign$1({}, options, {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
      }
      return options;
    }

    function yearMonthAmend(options) {
      options = amend(options, {
        day: false,
        hour: false,
        minute: false,
        second: false,
        weekday: false,
        dayPeriod: false,
        timeZoneName: false,
        dateStyle: false,
        timeStyle: false
      });
      if (!('year' in options || 'month' in options)) {
        options = ObjectAssign$1(options, { year: 'numeric', month: 'numeric' });
      }
      return options;
    }

    function monthDayAmend(options) {
      options = amend(options, {
        year: false,
        hour: false,
        minute: false,
        second: false,
        weekday: false,
        dayPeriod: false,
        timeZoneName: false,
        dateStyle: false,
        timeStyle: false
      });
      if (!('month' in options || 'day' in options)) {
        options = ObjectAssign$1({}, options, { month: 'numeric', day: 'numeric' });
      }
      return options;
    }

    function dateAmend(options) {
      options = amend(options, {
        hour: false,
        minute: false,
        second: false,
        dayPeriod: false,
        timeZoneName: false,
        timeStyle: false
      });
      if (!hasDateOptions(options)) {
        options = ObjectAssign$1({}, options, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
      }
      return options;
    }

    function datetimeAmend(options) {
      options = amend(options, { timeZoneName: false });
      if (!hasTimeOptions(options) && !hasDateOptions(options)) {
        options = ObjectAssign$1({}, options, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
      }
      return options;
    }

    function zonedDateTimeAmend(options) {
      if (!hasTimeOptions(options) && !hasDateOptions(options)) {
        options = ObjectAssign$1({}, options, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
        if (options.timeZoneName === undefined) options.timeZoneName = 'short';
      }
      return options;
    }

    function instantAmend(options) {
      if (!hasTimeOptions(options) && !hasDateOptions(options)) {
        options = ObjectAssign$1({}, options, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
      }
      return options;
    }

    function hasDateOptions(options) {
      return 'year' in options || 'month' in options || 'day' in options || 'weekday' in options || 'dateStyle' in options;
    }

    function hasTimeOptions(options) {
      return (
        'hour' in options || 'minute' in options || 'second' in options || 'timeStyle' in options || 'dayPeriod' in options
      );
    }

    function isTemporalObject(obj) {
      return (
        ES.IsTemporalDate(obj) ||
        ES.IsTemporalTime(obj) ||
        ES.IsTemporalDateTime(obj) ||
        ES.IsTemporalZonedDateTime(obj) ||
        ES.IsTemporalYearMonth(obj) ||
        ES.IsTemporalMonthDay(obj) ||
        ES.IsTemporalInstant(obj)
      );
    }

    function sameTemporalType(x, y) {
      if (!isTemporalObject(x) || !isTemporalObject(y)) return false;
      if (ES.IsTemporalTime(x) && !ES.IsTemporalTime(y)) return false;
      if (ES.IsTemporalDate(x) && !ES.IsTemporalDate(y)) return false;
      if (ES.IsTemporalDateTime(x) && !ES.IsTemporalDateTime(y)) return false;
      if (ES.IsTemporalZonedDateTime(x) && !ES.IsTemporalZonedDateTime(y)) return false;
      if (ES.IsTemporalYearMonth(x) && !ES.IsTemporalYearMonth(y)) return false;
      if (ES.IsTemporalMonthDay(x) && !ES.IsTemporalMonthDay(y)) return false;
      if (ES.IsTemporalInstant(x) && !ES.IsTemporalInstant(y)) return false;
      return true;
    }

    function extractOverrides(temporalObj, main) {
      const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');

      if (ES.IsTemporalTime(temporalObj)) {
        const hour = GetSlot(temporalObj, ISO_HOUR);
        const minute = GetSlot(temporalObj, ISO_MINUTE);
        const second = GetSlot(temporalObj, ISO_SECOND);
        const millisecond = GetSlot(temporalObj, ISO_MILLISECOND);
        const microsecond = GetSlot(temporalObj, ISO_MICROSECOND);
        const nanosecond = GetSlot(temporalObj, ISO_NANOSECOND);
        const datetime = new DateTime(1970, 1, 1, hour, minute, second, millisecond, microsecond, nanosecond, main[CAL_ID]);
        return {
          instant: ES.BuiltinTimeZoneGetInstantFor(getResolvedTimeZoneLazy(main), datetime, 'compatible'),
          formatter: getPropLazy(main, TIME)
        };
      }

      if (ES.IsTemporalYearMonth(temporalObj)) {
        const isoYear = GetSlot(temporalObj, ISO_YEAR);
        const isoMonth = GetSlot(temporalObj, ISO_MONTH);
        const referenceISODay = GetSlot(temporalObj, ISO_DAY);
        const calendar = ES.ToString(GetSlot(temporalObj, CALENDAR));
        if (calendar !== main[CAL_ID]) {
          throw new RangeError(
            `cannot format PlainYearMonth with calendar ${calendar} in locale with calendar ${main[CAL_ID]}`
          );
        }
        const datetime = new DateTime(isoYear, isoMonth, referenceISODay, 12, 0, 0, 0, 0, 0, calendar);
        return {
          instant: ES.BuiltinTimeZoneGetInstantFor(getResolvedTimeZoneLazy(main), datetime, 'compatible'),
          formatter: getPropLazy(main, YM)
        };
      }

      if (ES.IsTemporalMonthDay(temporalObj)) {
        const referenceISOYear = GetSlot(temporalObj, ISO_YEAR);
        const isoMonth = GetSlot(temporalObj, ISO_MONTH);
        const isoDay = GetSlot(temporalObj, ISO_DAY);
        const calendar = ES.ToString(GetSlot(temporalObj, CALENDAR));
        if (calendar !== main[CAL_ID]) {
          throw new RangeError(
            `cannot format PlainMonthDay with calendar ${calendar} in locale with calendar ${main[CAL_ID]}`
          );
        }
        const datetime = new DateTime(referenceISOYear, isoMonth, isoDay, 12, 0, 0, 0, 0, 0, calendar);
        return {
          instant: ES.BuiltinTimeZoneGetInstantFor(getResolvedTimeZoneLazy(main), datetime, 'compatible'),
          formatter: getPropLazy(main, MD)
        };
      }

      if (ES.IsTemporalDate(temporalObj)) {
        const isoYear = GetSlot(temporalObj, ISO_YEAR);
        const isoMonth = GetSlot(temporalObj, ISO_MONTH);
        const isoDay = GetSlot(temporalObj, ISO_DAY);
        const calendar = ES.ToString(GetSlot(temporalObj, CALENDAR));
        if (calendar !== 'iso8601' && calendar !== main[CAL_ID]) {
          throw new RangeError(`cannot format PlainDate with calendar ${calendar} in locale with calendar ${main[CAL_ID]}`);
        }
        const datetime = new DateTime(isoYear, isoMonth, isoDay, 12, 0, 0, 0, 0, 0, main[CAL_ID]);
        return {
          instant: ES.BuiltinTimeZoneGetInstantFor(getResolvedTimeZoneLazy(main), datetime, 'compatible'),
          formatter: getPropLazy(main, DATE)
        };
      }

      if (ES.IsTemporalDateTime(temporalObj)) {
        const isoYear = GetSlot(temporalObj, ISO_YEAR);
        const isoMonth = GetSlot(temporalObj, ISO_MONTH);
        const isoDay = GetSlot(temporalObj, ISO_DAY);
        const hour = GetSlot(temporalObj, ISO_HOUR);
        const minute = GetSlot(temporalObj, ISO_MINUTE);
        const second = GetSlot(temporalObj, ISO_SECOND);
        const millisecond = GetSlot(temporalObj, ISO_MILLISECOND);
        const microsecond = GetSlot(temporalObj, ISO_MICROSECOND);
        const nanosecond = GetSlot(temporalObj, ISO_NANOSECOND);
        const calendar = ES.ToString(GetSlot(temporalObj, CALENDAR));
        if (calendar !== 'iso8601' && calendar !== main[CAL_ID]) {
          throw new RangeError(
            `cannot format PlainDateTime with calendar ${calendar} in locale with calendar ${main[CAL_ID]}`
          );
        }
        let datetime = temporalObj;
        if (calendar === 'iso8601') {
          datetime = new DateTime(
            isoYear,
            isoMonth,
            isoDay,
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond,
            main[CAL_ID]
          );
        }
        return {
          instant: ES.BuiltinTimeZoneGetInstantFor(getResolvedTimeZoneLazy(main), datetime, 'compatible'),
          formatter: getPropLazy(main, DATETIME)
        };
      }

      if (ES.IsTemporalZonedDateTime(temporalObj)) {
        const calendar = ES.ToString(GetSlot(temporalObj, CALENDAR));
        if (calendar !== 'iso8601' && calendar !== main[CAL_ID]) {
          throw new RangeError(
            `cannot format ZonedDateTime with calendar ${calendar} in locale with calendar ${main[CAL_ID]}`
          );
        }

        let timeZone = GetSlot(temporalObj, TIME_ZONE);
        const objTimeZone = ES.ToString(timeZone);
        if (main[TZ_GIVEN] && main[TZ_GIVEN] !== objTimeZone) {
          throw new RangeError(`timeZone option ${main[TZ_GIVEN]} doesn't match actual time zone ${objTimeZone}`);
        }

        return {
          instant: GetSlot(temporalObj, INSTANT),
          formatter: getPropLazy(main, ZONED),
          timeZone: objTimeZone
        };
      }

      if (ES.IsTemporalInstant(temporalObj)) {
        return {
          instant: temporalObj,
          formatter: getPropLazy(main, INST)
        };
      }

      return {};
    }

    var Intl$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DateTimeFormat: DateTimeFormat
    });

    /* global false */

    const ObjectCreate$6 = Object.create;

    const DISALLOWED_UNITS$3 = ['year', 'month', 'week', 'day'];
    const MAX_DIFFERENCE_INCREMENTS = {
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };

    class Instant {
      constructor(epochNanoseconds) {
        // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
        //       to improve the error message.
        if (arguments.length < 1) {
          throw new TypeError('missing argument: epochNanoseconds is required');
        }

        const ns = ES.ToBigInt(epochNanoseconds);
        ES.ValidateEpochNanoseconds(ns);
        CreateSlots(this);
        SetSlot(this, EPOCHNANOSECONDS, ns);
      }

      get epochSeconds() {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        const value = GetSlot(this, EPOCHNANOSECONDS);
        return +value.divide(1e9);
      }
      get epochMilliseconds() {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        const value = bigInt(GetSlot(this, EPOCHNANOSECONDS));
        return +value.divide(1e6);
      }
      get epochMicroseconds() {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        const value = GetSlot(this, EPOCHNANOSECONDS);
        return bigIntIfAvailable$2(value.divide(1e3));
      }
      get epochNanoseconds() {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        return bigIntIfAvailable$2(GetSlot(this, EPOCHNANOSECONDS));
      }

      add(temporalDurationLike) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.ToLimitedTemporalDuration(
          temporalDurationLike,
          ['years', 'months', 'weeks', 'days']
        );
        const ns = ES.AddInstant(
          GetSlot(this, EPOCHNANOSECONDS),
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        );
        return new Instant(ns);
      }
      subtract(temporalDurationLike) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.ToLimitedTemporalDuration(
          temporalDurationLike,
          ['years', 'months', 'weeks', 'days']
        );
        const ns = ES.AddInstant(
          GetSlot(this, EPOCHNANOSECONDS),
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds
        );
        return new Instant(ns);
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalInstant(other);
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS$3);
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('second', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$3, defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_DIFFERENCE_INCREMENTS[smallestUnit], false);
        const onens = GetSlot(this, EPOCHNANOSECONDS);
        const twons = GetSlot(other, EPOCHNANOSECONDS);
        let { seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
          onens,
          twons,
          roundingIncrement,
          smallestUnit,
          roundingMode
        );
        let hours, minutes;
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          0,
          0,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalInstant(other);
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS$3);
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('second', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$3, defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_DIFFERENCE_INCREMENTS[smallestUnit], false);
        const onens = GetSlot(other, EPOCHNANOSECONDS);
        const twons = GetSlot(this, EPOCHNANOSECONDS);
        let { seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
          onens,
          twons,
          roundingIncrement,
          smallestUnit,
          roundingMode
        );
        let hours, minutes;
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          0,
          0,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      round(roundTo) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        if (roundTo === undefined) throw new TypeError('options parameter is required');
        if (ES.Type(roundTo) === 'String') {
          const stringParam = roundTo;
          roundTo = ObjectCreate$6(null);
          roundTo.smallestUnit = stringParam;
        } else {
          roundTo = ES.GetOptionsObject(roundTo);
        }
        const smallestUnit = ES.ToSmallestTemporalUnit(roundTo, undefined, DISALLOWED_UNITS$3);
        if (smallestUnit === undefined) throw new RangeError('smallestUnit is required');
        const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
        const maximumIncrements = {
          hour: 24,
          minute: 1440,
          second: 86400,
          millisecond: 86400e3,
          microsecond: 86400e6,
          nanosecond: 86400e9
        };
        const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo, maximumIncrements[smallestUnit], true);
        const ns = GetSlot(this, EPOCHNANOSECONDS);
        const roundedNs = ES.RoundInstant(ns, roundingIncrement, smallestUnit, roundingMode);
        return new Instant(roundedNs);
      }
      equals(other) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalInstant(other);
        const one = GetSlot(this, EPOCHNANOSECONDS);
        const two = GetSlot(other, EPOCHNANOSECONDS);
        return bigInt(one).equals(two);
      }
      toString(options = undefined) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        let timeZone = options.timeZone;
        if (timeZone !== undefined) timeZone = ES.ToTemporalTimeZone(timeZone);
        const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const ns = GetSlot(this, EPOCHNANOSECONDS);
        const roundedNs = ES.RoundInstant(ns, increment, unit, roundingMode);
        const roundedInstant = new Instant(roundedNs);
        return ES.TemporalInstantToString(roundedInstant, timeZone, precision);
      }
      toJSON() {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        return ES.TemporalInstantToString(this, undefined, 'auto');
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.Instant');
      }
      toZonedDateTime(item) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        if (ES.Type(item) !== 'Object') {
          throw new TypeError('invalid argument in toZonedDateTime');
        }
        const calendarLike = item.calendar;
        if (calendarLike === undefined) {
          throw new TypeError('missing calendar property in toZonedDateTime');
        }
        const calendar = ES.ToTemporalCalendar(calendarLike);
        const temporalTimeZoneLike = item.timeZone;
        if (temporalTimeZoneLike === undefined) {
          throw new TypeError('missing timeZone property in toZonedDateTime');
        }
        const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
        return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, calendar);
      }
      toZonedDateTimeISO(item) {
        if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
        if (ES.Type(item) === 'Object') {
          const timeZoneProperty = item.timeZone;
          if (timeZoneProperty !== undefined) {
            item = timeZoneProperty;
          }
        }
        const timeZone = ES.ToTemporalTimeZone(item);
        const calendar = ES.GetISO8601Calendar();
        return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, calendar);
      }

      static fromEpochSeconds(epochSeconds) {
        epochSeconds = ES.ToNumber(epochSeconds);
        const epochNanoseconds = bigInt(epochSeconds).multiply(1e9);
        ES.ValidateEpochNanoseconds(epochNanoseconds);
        return new Instant(epochNanoseconds);
      }
      static fromEpochMilliseconds(epochMilliseconds) {
        epochMilliseconds = ES.ToNumber(epochMilliseconds);
        const epochNanoseconds = bigInt(epochMilliseconds).multiply(1e6);
        ES.ValidateEpochNanoseconds(epochNanoseconds);
        return new Instant(epochNanoseconds);
      }
      static fromEpochMicroseconds(epochMicroseconds) {
        epochMicroseconds = ES.ToBigInt(epochMicroseconds);
        const epochNanoseconds = epochMicroseconds.multiply(1e3);
        ES.ValidateEpochNanoseconds(epochNanoseconds);
        return new Instant(epochNanoseconds);
      }
      static fromEpochNanoseconds(epochNanoseconds) {
        epochNanoseconds = ES.ToBigInt(epochNanoseconds);
        ES.ValidateEpochNanoseconds(epochNanoseconds);
        return new Instant(epochNanoseconds);
      }
      static from(item) {
        if (ES.IsTemporalInstant(item)) {
          return new Instant(GetSlot(item, EPOCHNANOSECONDS));
        }
        return ES.ToTemporalInstant(item);
      }
      static compare(one, two) {
        one = ES.ToTemporalInstant(one);
        two = ES.ToTemporalInstant(two);
        one = GetSlot(one, EPOCHNANOSECONDS);
        two = GetSlot(two, EPOCHNANOSECONDS);
        if (bigInt(one).lesser(two)) return -1;
        if (bigInt(one).greater(two)) return 1;
        return 0;
      }
    }

    MakeIntrinsicClass(Instant, 'Temporal.Instant');

    function bigIntIfAvailable$2(wrapper) {
      return typeof BigInt === 'undefined' ? wrapper : wrapper.value;
    }

    const DISALLOWED_UNITS$2 = ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'];

    class PlainDate {
      constructor(isoYear, isoMonth, isoDay, calendar = ES.GetISO8601Calendar()) {
        isoYear = ES.ToIntegerThrowOnInfinity(isoYear);
        isoMonth = ES.ToIntegerThrowOnInfinity(isoMonth);
        isoDay = ES.ToIntegerThrowOnInfinity(isoDay);
        calendar = ES.ToTemporalCalendar(calendar);

        // Note: if the arguments are not passed,
        //       ToIntegerThrowOnInfinity(undefined) will have returned 0, which will
        //       be rejected by RejectISODate in CreateTemporalDateSlots. This check
        //       exists only to improve the error message.
        if (arguments.length < 3) {
          throw new RangeError('missing argument: isoYear, isoMonth and isoDay are required');
        }

        ES.CreateTemporalDateSlots(this, isoYear, isoMonth, isoDay, calendar);
      }
      get calendar() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }
      get era() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEra(GetSlot(this, CALENDAR), this);
      }
      get eraYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
      }
      get year() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarYear(GetSlot(this, CALENDAR), this);
      }
      get month() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
      }
      get monthCode() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
      }
      get day() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDay(GetSlot(this, CALENDAR), this);
      }
      get dayOfWeek() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), this);
      }
      get dayOfYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), this);
      }
      get weekOfYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), this);
      }
      get daysInWeek() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), this);
      }
      get daysInMonth() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
      }
      get daysInYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
      }
      get monthsInYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
      }
      get inLeapYear() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
      }
      with(temporalDateLike, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalDateLike) !== 'Object') {
          throw new TypeError('invalid argument');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalDateLike);

        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
        const props = ES.ToPartialRecord(temporalDateLike, fieldNames);
        if (!props) {
          throw new TypeError('invalid date-like');
        }
        let fields = ES.ToTemporalDateFields(this, fieldNames);
        fields = ES.CalendarMergeFields(calendar, fields, props);
        fields = ES.ToTemporalDateFields(fields, fieldNames);

        options = ES.GetOptionsObject(options);

        return ES.DateFromFields(calendar, fields, options);
      }
      withCalendar(calendar) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        calendar = ES.ToTemporalCalendar(calendar);
        return new PlainDate(GetSlot(this, ISO_YEAR), GetSlot(this, ISO_MONTH), GetSlot(this, ISO_DAY), calendar);
      }
      add(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

        const duration = ES.ToTemporalDuration(temporalDurationLike);
        options = ES.GetOptionsObject(options);

        return ES.CalendarDateAdd(GetSlot(this, CALENDAR), this, duration, options);
      }
      subtract(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

        const duration = ES.CreateNegatedTemporalDuration(ES.ToTemporalDuration(temporalDurationLike));
        options = ES.GetOptionsObject(options);

        return ES.CalendarDateAdd(GetSlot(this, CALENDAR), this, duration, options);
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDate(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }

        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'day', DISALLOWED_UNITS$2);
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('day', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$2, defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, undefined, false);

        const untilOptions = { ...options, largestUnit };
        const result = ES.CalendarDateUntil(calendar, this, other, untilOptions);
        if (smallestUnit === 'day' && roundingIncrement === 1) return result;

        let { years, months, weeks, days } = result;
        ({ years, months, weeks, days } = ES.RoundDuration(
          years,
          months,
          weeks,
          days,
          0,
          0,
          0,
          0,
          0,
          0,
          roundingIncrement,
          smallestUnit,
          roundingMode,
          this
        ));

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDate(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }

        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'day', DISALLOWED_UNITS$2);
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('day', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$2, defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, undefined, false);

        const untilOptions = { ...options, largestUnit };
        let { years, months, weeks, days } = ES.CalendarDateUntil(calendar, this, other, untilOptions);
        const Duration = GetIntrinsic('%Temporal.Duration%');
        if (smallestUnit === 'day' && roundingIncrement === 1) {
          return new Duration(-years, -months, -weeks, -days, 0, 0, 0, 0, 0, 0);
        }
        ({ years, months, weeks, days } = ES.RoundDuration(
          years,
          months,
          weeks,
          days,
          0,
          0,
          0,
          0,
          0,
          0,
          roundingIncrement,
          smallestUnit,
          ES.NegateTemporalRoundingMode(roundingMode),
          this
        ));

        return new Duration(-years, -months, -weeks, -days, 0, 0, 0, 0, 0, 0);
      }
      equals(other) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDate(other);
        for (const slot of [ISO_YEAR, ISO_MONTH, ISO_DAY]) {
          const val1 = GetSlot(this, slot);
          const val2 = GetSlot(other, slot);
          if (val1 !== val2) return false;
        }
        return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
      }
      toString(options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const showCalendar = ES.ToShowCalendarOption(options);
        return ES.TemporalDateToString(this, showCalendar);
      }
      toJSON() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateToString(this);
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.PlainDate');
      }
      toPlainDateTime(temporalTime = undefined) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        const year = GetSlot(this, ISO_YEAR);
        const month = GetSlot(this, ISO_MONTH);
        const day = GetSlot(this, ISO_DAY);
        const calendar = GetSlot(this, CALENDAR);

        if (temporalTime === undefined) return ES.CreateTemporalDateTime(year, month, day, 0, 0, 0, 0, 0, 0, calendar);

        temporalTime = ES.ToTemporalTime(temporalTime);
        const hour = GetSlot(temporalTime, ISO_HOUR);
        const minute = GetSlot(temporalTime, ISO_MINUTE);
        const second = GetSlot(temporalTime, ISO_SECOND);
        const millisecond = GetSlot(temporalTime, ISO_MILLISECOND);
        const microsecond = GetSlot(temporalTime, ISO_MICROSECOND);
        const nanosecond = GetSlot(temporalTime, ISO_NANOSECOND);

        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      toZonedDateTime(item) {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

        let timeZone, temporalTime;
        if (ES.Type(item) === 'Object') {
          let timeZoneLike = item.timeZone;
          if (timeZoneLike === undefined) {
            timeZone = ES.ToTemporalTimeZone(item);
          } else {
            timeZone = ES.ToTemporalTimeZone(timeZoneLike);
            temporalTime = item.plainTime;
          }
        } else {
          timeZone = ES.ToTemporalTimeZone(item);
        }

        const year = GetSlot(this, ISO_YEAR);
        const month = GetSlot(this, ISO_MONTH);
        const day = GetSlot(this, ISO_DAY);
        const calendar = GetSlot(this, CALENDAR);

        let hour = 0,
          minute = 0,
          second = 0,
          millisecond = 0,
          microsecond = 0,
          nanosecond = 0;
        if (temporalTime !== undefined) {
          temporalTime = ES.ToTemporalTime(temporalTime);
          hour = GetSlot(temporalTime, ISO_HOUR);
          minute = GetSlot(temporalTime, ISO_MINUTE);
          second = GetSlot(temporalTime, ISO_SECOND);
          millisecond = GetSlot(temporalTime, ISO_MILLISECOND);
          microsecond = GetSlot(temporalTime, ISO_MICROSECOND);
          nanosecond = GetSlot(temporalTime, ISO_NANOSECOND);
        }

        const dt = ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, 'compatible');
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
      }
      toPlainYearMonth() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        return ES.YearMonthFromFields(calendar, fields);
      }
      toPlainMonthDay() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['day', 'monthCode']);
        const fields = ES.ToTemporalMonthDayFields(this, fieldNames);
        return ES.MonthDayFromFields(calendar, fields);
      }
      getISOFields() {
        if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
        return {
          calendar: GetSlot(this, CALENDAR),
          isoDay: GetSlot(this, ISO_DAY),
          isoMonth: GetSlot(this, ISO_MONTH),
          isoYear: GetSlot(this, ISO_YEAR)
        };
      }
      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        if (ES.IsTemporalDate(item)) {
          ES.ToTemporalOverflow(options); // validate and ignore
          return ES.CreateTemporalDate(
            GetSlot(item, ISO_YEAR),
            GetSlot(item, ISO_MONTH),
            GetSlot(item, ISO_DAY),
            GetSlot(item, CALENDAR)
          );
        }
        return ES.ToTemporalDate(item, options);
      }
      static compare(one, two) {
        one = ES.ToTemporalDate(one);
        two = ES.ToTemporalDate(two);
        return ES.CompareISODate(
          GetSlot(one, ISO_YEAR),
          GetSlot(one, ISO_MONTH),
          GetSlot(one, ISO_DAY),
          GetSlot(two, ISO_YEAR),
          GetSlot(two, ISO_MONTH),
          GetSlot(two, ISO_DAY)
        );
      }
    }

    MakeIntrinsicClass(PlainDate, 'Temporal.PlainDate');

    const ObjectCreate$5 = Object.create;

    class PlainDateTime {
      constructor(
        isoYear,
        isoMonth,
        isoDay,
        hour = 0,
        minute = 0,
        second = 0,
        millisecond = 0,
        microsecond = 0,
        nanosecond = 0,
        calendar = ES.GetISO8601Calendar()
      ) {
        isoYear = ES.ToIntegerThrowOnInfinity(isoYear);
        isoMonth = ES.ToIntegerThrowOnInfinity(isoMonth);
        isoDay = ES.ToIntegerThrowOnInfinity(isoDay);
        hour = ES.ToIntegerThrowOnInfinity(hour);
        minute = ES.ToIntegerThrowOnInfinity(minute);
        second = ES.ToIntegerThrowOnInfinity(second);
        millisecond = ES.ToIntegerThrowOnInfinity(millisecond);
        microsecond = ES.ToIntegerThrowOnInfinity(microsecond);
        nanosecond = ES.ToIntegerThrowOnInfinity(nanosecond);
        calendar = ES.ToTemporalCalendar(calendar);

        // Note: if the arguments are not passed,
        //       ToIntegerThrowOnInfinity(undefined) will have returned 0, which will
        //       be rejected by RejectDateTime in CreateTemporalDateTimeSlots. This
        //       check exists only to improve the error message.
        if (arguments.length < 3) {
          throw new RangeError('missing argument: isoYear, isoMonth and isoDay are required');
        }

        ES.CreateTemporalDateTimeSlots(
          this,
          isoYear,
          isoMonth,
          isoDay,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      get calendar() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }
      get year() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarYear(GetSlot(this, CALENDAR), this);
      }
      get month() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
      }
      get monthCode() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
      }
      get day() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDay(GetSlot(this, CALENDAR), this);
      }
      get hour() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_HOUR);
      }
      get minute() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MINUTE);
      }
      get second() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_SECOND);
      }
      get millisecond() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MILLISECOND);
      }
      get microsecond() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MICROSECOND);
      }
      get nanosecond() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_NANOSECOND);
      }
      get era() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEra(GetSlot(this, CALENDAR), this);
      }
      get eraYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
      }
      get dayOfWeek() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), this);
      }
      get dayOfYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), this);
      }
      get weekOfYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), this);
      }
      get daysInWeek() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), this);
      }
      get daysInYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
      }
      get daysInMonth() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
      }
      get monthsInYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
      }
      get inLeapYear() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
      }
      with(temporalDateTimeLike, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalDateTimeLike) !== 'Object') {
          throw new TypeError('invalid argument');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalDateTimeLike);

        options = ES.GetOptionsObject(options);
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, [
          'day',
          'hour',
          'microsecond',
          'millisecond',
          'minute',
          'month',
          'monthCode',
          'nanosecond',
          'second',
          'year'
        ]);
        const props = ES.ToPartialRecord(temporalDateTimeLike, fieldNames);
        if (!props) {
          throw new TypeError('invalid date-time-like');
        }
        let fields = ES.ToTemporalDateTimeFields(this, fieldNames);
        fields = ES.CalendarMergeFields(calendar, fields, props);
        fields = ES.ToTemporalDateTimeFields(fields, fieldNames);
        const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
          ES.InterpretTemporalDateTimeFields(calendar, fields, options);

        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      withPlainTime(temporalTime = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        const year = GetSlot(this, ISO_YEAR);
        const month = GetSlot(this, ISO_MONTH);
        const day = GetSlot(this, ISO_DAY);
        const calendar = GetSlot(this, CALENDAR);

        if (temporalTime === undefined) return ES.CreateTemporalDateTime(year, month, day, 0, 0, 0, 0, 0, 0, calendar);

        temporalTime = ES.ToTemporalTime(temporalTime);
        const hour = GetSlot(temporalTime, ISO_HOUR);
        const minute = GetSlot(temporalTime, ISO_MINUTE);
        const second = GetSlot(temporalTime, ISO_SECOND);
        const millisecond = GetSlot(temporalTime, ISO_MILLISECOND);
        const microsecond = GetSlot(temporalTime, ISO_MICROSECOND);
        const nanosecond = GetSlot(temporalTime, ISO_NANOSECOND);

        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      withPlainDate(temporalDate) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');

        temporalDate = ES.ToTemporalDate(temporalDate);
        const year = GetSlot(temporalDate, ISO_YEAR);
        const month = GetSlot(temporalDate, ISO_MONTH);
        const day = GetSlot(temporalDate, ISO_DAY);
        let calendar = GetSlot(temporalDate, CALENDAR);

        const hour = GetSlot(this, ISO_HOUR);
        const minute = GetSlot(this, ISO_MINUTE);
        const second = GetSlot(this, ISO_SECOND);
        const millisecond = GetSlot(this, ISO_MILLISECOND);
        const microsecond = GetSlot(this, ISO_MICROSECOND);
        const nanosecond = GetSlot(this, ISO_NANOSECOND);

        calendar = ES.ConsolidateCalendars(GetSlot(this, CALENDAR), calendar);
        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      withCalendar(calendar) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        calendar = ES.ToTemporalCalendar(calendar);
        return new PlainDateTime(
          GetSlot(this, ISO_YEAR),
          GetSlot(this, ISO_MONTH),
          GetSlot(this, ISO_DAY),
          GetSlot(this, ISO_HOUR),
          GetSlot(this, ISO_MINUTE),
          GetSlot(this, ISO_SECOND),
          GetSlot(this, ISO_MILLISECOND),
          GetSlot(this, ISO_MICROSECOND),
          GetSlot(this, ISO_NANOSECOND),
          calendar
        );
      }
      add(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        let duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        options = ES.GetOptionsObject(options);
        const calendar = GetSlot(this, CALENDAR);
        const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddDateTime(
          GetSlot(this, ISO_YEAR),
          GetSlot(this, ISO_MONTH),
          GetSlot(this, ISO_DAY),
          GetSlot(this, ISO_HOUR),
          GetSlot(this, ISO_MINUTE),
          GetSlot(this, ISO_SECOND),
          GetSlot(this, ISO_MILLISECOND),
          GetSlot(this, ISO_MICROSECOND),
          GetSlot(this, ISO_NANOSECOND),
          calendar,
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          options
        );
        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      subtract(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        let duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        options = ES.GetOptionsObject(options);
        const calendar = GetSlot(this, CALENDAR);
        const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddDateTime(
          GetSlot(this, ISO_YEAR),
          GetSlot(this, ISO_MONTH),
          GetSlot(this, ISO_DAY),
          GetSlot(this, ISO_HOUR),
          GetSlot(this, ISO_MINUTE),
          GetSlot(this, ISO_SECOND),
          GetSlot(this, ISO_MILLISECOND),
          GetSlot(this, ISO_MICROSECOND),
          GetSlot(this, ISO_NANOSECOND),
          calendar,
          -years,
          -months,
          -weeks,
          -days,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds,
          options
        );
        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDateTime(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond');
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('day', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', [], defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalDateTimeRoundingIncrement(options, smallestUnit);

        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.DifferenceISODateTime(
            GetSlot(this, ISO_YEAR),
            GetSlot(this, ISO_MONTH),
            GetSlot(this, ISO_DAY),
            GetSlot(this, ISO_HOUR),
            GetSlot(this, ISO_MINUTE),
            GetSlot(this, ISO_SECOND),
            GetSlot(this, ISO_MILLISECOND),
            GetSlot(this, ISO_MICROSECOND),
            GetSlot(this, ISO_NANOSECOND),
            GetSlot(other, ISO_YEAR),
            GetSlot(other, ISO_MONTH),
            GetSlot(other, ISO_DAY),
            GetSlot(other, ISO_HOUR),
            GetSlot(other, ISO_MINUTE),
            GetSlot(other, ISO_SECOND),
            GetSlot(other, ISO_MILLISECOND),
            GetSlot(other, ISO_MICROSECOND),
            GetSlot(other, ISO_NANOSECOND),
            calendar,
            largestUnit,
            options
          );

        const relativeTo = ES.TemporalDateTimeToDate(this);
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.RoundDuration(
            years,
            months,
            weeks,
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            roundingIncrement,
            smallestUnit,
            roundingMode,
            relativeTo
          ));
        ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDateTime(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond');
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('day', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', [], defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalDateTimeRoundingIncrement(options, smallestUnit);

        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.DifferenceISODateTime(
            GetSlot(this, ISO_YEAR),
            GetSlot(this, ISO_MONTH),
            GetSlot(this, ISO_DAY),
            GetSlot(this, ISO_HOUR),
            GetSlot(this, ISO_MINUTE),
            GetSlot(this, ISO_SECOND),
            GetSlot(this, ISO_MILLISECOND),
            GetSlot(this, ISO_MICROSECOND),
            GetSlot(this, ISO_NANOSECOND),
            GetSlot(other, ISO_YEAR),
            GetSlot(other, ISO_MONTH),
            GetSlot(other, ISO_DAY),
            GetSlot(other, ISO_HOUR),
            GetSlot(other, ISO_MINUTE),
            GetSlot(other, ISO_SECOND),
            GetSlot(other, ISO_MILLISECOND),
            GetSlot(other, ISO_MICROSECOND),
            GetSlot(other, ISO_NANOSECOND),
            calendar,
            largestUnit,
            options
          );

        const relativeTo = ES.TemporalDateTimeToDate(this);
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.RoundDuration(
            years,
            months,
            weeks,
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            roundingIncrement,
            smallestUnit,
            ES.NegateTemporalRoundingMode(roundingMode),
            relativeTo
          ));
        ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(
          -years,
          -months,
          -weeks,
          -days,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds
        );
      }
      round(roundTo) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        if (roundTo === undefined) throw new TypeError('options parameter is required');
        if (ES.Type(roundTo) === 'String') {
          const stringParam = roundTo;
          roundTo = ObjectCreate$5(null);
          roundTo.smallestUnit = stringParam;
        } else {
          roundTo = ES.GetOptionsObject(roundTo);
        }
        const smallestUnit = ES.ToSmallestTemporalUnit(roundTo, undefined, ['year', 'month', 'week']);
        if (smallestUnit === undefined) throw new RangeError('smallestUnit is required');
        const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
        const maximumIncrements = {
          day: 1,
          hour: 24,
          minute: 60,
          second: 60,
          millisecond: 1000,
          microsecond: 1000,
          nanosecond: 1000
        };
        const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo, maximumIncrements[smallestUnit], false);

        let year = GetSlot(this, ISO_YEAR);
        let month = GetSlot(this, ISO_MONTH);
        let day = GetSlot(this, ISO_DAY);
        let hour = GetSlot(this, ISO_HOUR);
        let minute = GetSlot(this, ISO_MINUTE);
        let second = GetSlot(this, ISO_SECOND);
        let millisecond = GetSlot(this, ISO_MILLISECOND);
        let microsecond = GetSlot(this, ISO_MICROSECOND);
        let nanosecond = GetSlot(this, ISO_NANOSECOND);
        ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          roundingIncrement,
          smallestUnit,
          roundingMode
        ));

        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          GetSlot(this, CALENDAR)
        );
      }
      equals(other) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalDateTime(other);
        for (const slot of [
          ISO_YEAR,
          ISO_MONTH,
          ISO_DAY,
          ISO_HOUR,
          ISO_MINUTE,
          ISO_SECOND,
          ISO_MILLISECOND,
          ISO_MICROSECOND,
          ISO_NANOSECOND
        ]) {
          const val1 = GetSlot(this, slot);
          const val2 = GetSlot(other, slot);
          if (val1 !== val2) return false;
        }
        return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
      }
      toString(options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
        const showCalendar = ES.ToShowCalendarOption(options);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        return ES.TemporalDateTimeToString(this, precision, showCalendar, { unit, increment, roundingMode });
      }
      toJSON() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateTimeToString(this, 'auto');
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.PlainDateTime');
      }

      toZonedDateTime(temporalTimeZoneLike, options = undefined) {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
        options = ES.GetOptionsObject(options);
        const disambiguation = ES.ToTemporalDisambiguation(options);
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, this, disambiguation);
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
      }
      toPlainDate() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateTimeToDate(this);
      }
      toPlainYearMonth() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        return ES.YearMonthFromFields(calendar, fields);
      }
      toPlainMonthDay() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['day', 'monthCode']);
        const fields = ES.ToTemporalMonthDayFields(this, fieldNames);
        return ES.MonthDayFromFields(calendar, fields);
      }
      toPlainTime() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateTimeToTime(this);
      }
      getISOFields() {
        if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
        return {
          calendar: GetSlot(this, CALENDAR),
          isoDay: GetSlot(this, ISO_DAY),
          isoHour: GetSlot(this, ISO_HOUR),
          isoMicrosecond: GetSlot(this, ISO_MICROSECOND),
          isoMillisecond: GetSlot(this, ISO_MILLISECOND),
          isoMinute: GetSlot(this, ISO_MINUTE),
          isoMonth: GetSlot(this, ISO_MONTH),
          isoNanosecond: GetSlot(this, ISO_NANOSECOND),
          isoSecond: GetSlot(this, ISO_SECOND),
          isoYear: GetSlot(this, ISO_YEAR)
        };
      }

      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        if (ES.IsTemporalDateTime(item)) {
          ES.ToTemporalOverflow(options); // validate and ignore
          return ES.CreateTemporalDateTime(
            GetSlot(item, ISO_YEAR),
            GetSlot(item, ISO_MONTH),
            GetSlot(item, ISO_DAY),
            GetSlot(item, ISO_HOUR),
            GetSlot(item, ISO_MINUTE),
            GetSlot(item, ISO_SECOND),
            GetSlot(item, ISO_MILLISECOND),
            GetSlot(item, ISO_MICROSECOND),
            GetSlot(item, ISO_NANOSECOND),
            GetSlot(item, CALENDAR)
          );
        }
        return ES.ToTemporalDateTime(item, options);
      }
      static compare(one, two) {
        one = ES.ToTemporalDateTime(one);
        two = ES.ToTemporalDateTime(two);
        for (const slot of [
          ISO_YEAR,
          ISO_MONTH,
          ISO_DAY,
          ISO_HOUR,
          ISO_MINUTE,
          ISO_SECOND,
          ISO_MILLISECOND,
          ISO_MICROSECOND,
          ISO_NANOSECOND
        ]) {
          const val1 = GetSlot(one, slot);
          const val2 = GetSlot(two, slot);
          if (val1 !== val2) return ES.ComparisonResult(val1 - val2);
        }
        return 0;
      }
    }

    MakeIntrinsicClass(PlainDateTime, 'Temporal.PlainDateTime');

    /* global false */

    const ObjectCreate$4 = Object.create;

    class Duration {
      constructor(
        years = 0,
        months = 0,
        weeks = 0,
        days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0,
        milliseconds = 0,
        microseconds = 0,
        nanoseconds = 0
      ) {
        years = ES.ToIntegerWithoutRounding(years);
        months = ES.ToIntegerWithoutRounding(months);
        weeks = ES.ToIntegerWithoutRounding(weeks);
        days = ES.ToIntegerWithoutRounding(days);
        hours = ES.ToIntegerWithoutRounding(hours);
        minutes = ES.ToIntegerWithoutRounding(minutes);
        seconds = ES.ToIntegerWithoutRounding(seconds);
        milliseconds = ES.ToIntegerWithoutRounding(milliseconds);
        microseconds = ES.ToIntegerWithoutRounding(microseconds);
        nanoseconds = ES.ToIntegerWithoutRounding(nanoseconds);

        const sign = ES.DurationSign(
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        );
        for (const prop of [years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds]) {
          if (!Number.isFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
          const propSign = Math.sign(prop);
          if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
        }

        CreateSlots(this);
        SetSlot(this, YEARS, years);
        SetSlot(this, MONTHS, months);
        SetSlot(this, WEEKS, weeks);
        SetSlot(this, DAYS, days);
        SetSlot(this, HOURS, hours);
        SetSlot(this, MINUTES, minutes);
        SetSlot(this, SECONDS, seconds);
        SetSlot(this, MILLISECONDS, milliseconds);
        SetSlot(this, MICROSECONDS, microseconds);
        SetSlot(this, NANOSECONDS, nanoseconds);
      }
      get years() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, YEARS);
      }
      get months() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, MONTHS);
      }
      get weeks() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, WEEKS);
      }
      get days() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, DAYS);
      }
      get hours() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, HOURS);
      }
      get minutes() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, MINUTES);
      }
      get seconds() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, SECONDS);
      }
      get milliseconds() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, MILLISECONDS);
      }
      get microseconds() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, MICROSECONDS);
      }
      get nanoseconds() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, NANOSECONDS);
      }
      get sign() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return ES.DurationSign(
          GetSlot(this, YEARS),
          GetSlot(this, MONTHS),
          GetSlot(this, WEEKS),
          GetSlot(this, DAYS),
          GetSlot(this, HOURS),
          GetSlot(this, MINUTES),
          GetSlot(this, SECONDS),
          GetSlot(this, MILLISECONDS),
          GetSlot(this, MICROSECONDS),
          GetSlot(this, NANOSECONDS)
        );
      }
      get blank() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return (
          ES.DurationSign(
            GetSlot(this, YEARS),
            GetSlot(this, MONTHS),
            GetSlot(this, WEEKS),
            GetSlot(this, DAYS),
            GetSlot(this, HOURS),
            GetSlot(this, MINUTES),
            GetSlot(this, SECONDS),
            GetSlot(this, MILLISECONDS),
            GetSlot(this, MICROSECONDS),
            GetSlot(this, NANOSECONDS)
          ) === 0
        );
      }
      with(durationLike) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        const props = ES.ToPartialRecord(durationLike, [
          'days',
          'hours',
          'microseconds',
          'milliseconds',
          'minutes',
          'months',
          'nanoseconds',
          'seconds',
          'weeks',
          'years'
        ]);
        if (!props) {
          throw new TypeError('invalid duration-like');
        }
        let {
          years = GetSlot(this, YEARS),
          months = GetSlot(this, MONTHS),
          weeks = GetSlot(this, WEEKS),
          days = GetSlot(this, DAYS),
          hours = GetSlot(this, HOURS),
          minutes = GetSlot(this, MINUTES),
          seconds = GetSlot(this, SECONDS),
          milliseconds = GetSlot(this, MILLISECONDS),
          microseconds = GetSlot(this, MICROSECONDS),
          nanoseconds = GetSlot(this, NANOSECONDS)
        } = props;
        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      negated() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return ES.CreateNegatedTemporalDuration(this);
      }
      abs() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return new Duration(
          Math.abs(GetSlot(this, YEARS)),
          Math.abs(GetSlot(this, MONTHS)),
          Math.abs(GetSlot(this, WEEKS)),
          Math.abs(GetSlot(this, DAYS)),
          Math.abs(GetSlot(this, HOURS)),
          Math.abs(GetSlot(this, MINUTES)),
          Math.abs(GetSlot(this, SECONDS)),
          Math.abs(GetSlot(this, MILLISECONDS)),
          Math.abs(GetSlot(this, MICROSECONDS)),
          Math.abs(GetSlot(this, NANOSECONDS))
        );
      }
      add(other, options = undefined) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.ToLimitedTemporalDuration(other);
        options = ES.GetOptionsObject(options);
        const relativeTo = ES.ToRelativeTemporalObject(options);
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.AddDuration(
          GetSlot(this, YEARS),
          GetSlot(this, MONTHS),
          GetSlot(this, WEEKS),
          GetSlot(this, DAYS),
          GetSlot(this, HOURS),
          GetSlot(this, MINUTES),
          GetSlot(this, SECONDS),
          GetSlot(this, MILLISECONDS),
          GetSlot(this, MICROSECONDS),
          GetSlot(this, NANOSECONDS),
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          relativeTo
        ));
        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      subtract(other, options = undefined) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.ToLimitedTemporalDuration(other);
        options = ES.GetOptionsObject(options);
        const relativeTo = ES.ToRelativeTemporalObject(options);
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.AddDuration(
          GetSlot(this, YEARS),
          GetSlot(this, MONTHS),
          GetSlot(this, WEEKS),
          GetSlot(this, DAYS),
          GetSlot(this, HOURS),
          GetSlot(this, MINUTES),
          GetSlot(this, SECONDS),
          GetSlot(this, MILLISECONDS),
          GetSlot(this, MICROSECONDS),
          GetSlot(this, NANOSECONDS),
          -years,
          -months,
          -weeks,
          -days,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds,
          relativeTo
        ));
        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      round(roundTo) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        if (roundTo === undefined) throw new TypeError('options parameter is required');
        let years = GetSlot(this, YEARS);
        let months = GetSlot(this, MONTHS);
        let weeks = GetSlot(this, WEEKS);
        let days = GetSlot(this, DAYS);
        let hours = GetSlot(this, HOURS);
        let minutes = GetSlot(this, MINUTES);
        let seconds = GetSlot(this, SECONDS);
        let milliseconds = GetSlot(this, MILLISECONDS);
        let microseconds = GetSlot(this, MICROSECONDS);
        let nanoseconds = GetSlot(this, NANOSECONDS);

        let defaultLargestUnit = ES.DefaultTemporalLargestUnit(
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        );
        if (ES.Type(roundTo) === 'String') {
          const stringParam = roundTo;
          roundTo = ObjectCreate$4(null);
          roundTo.smallestUnit = stringParam;
        } else {
          roundTo = ES.GetOptionsObject(roundTo);
        }
        let smallestUnit = ES.ToSmallestTemporalUnit(roundTo, undefined);
        let smallestUnitPresent = true;
        if (!smallestUnit) {
          smallestUnitPresent = false;
          smallestUnit = 'nanosecond';
        }
        defaultLargestUnit = ES.LargerOfTwoTemporalUnits(defaultLargestUnit, smallestUnit);
        let largestUnit = ES.ToLargestTemporalUnit(roundTo, undefined);
        let largestUnitPresent = true;
        if (!largestUnit) {
          largestUnitPresent = false;
          largestUnit = defaultLargestUnit;
        }
        if (largestUnit === 'auto') largestUnit = defaultLargestUnit;
        if (!smallestUnitPresent && !largestUnitPresent) {
          throw new RangeError('at least one of smallestUnit or largestUnit is required');
        }
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
        const roundingIncrement = ES.ToTemporalDateTimeRoundingIncrement(roundTo, smallestUnit);
        let relativeTo = ES.ToRelativeTemporalObject(roundTo);

        ({ years, months, weeks, days } = ES.UnbalanceDurationRelative(
          years,
          months,
          weeks,
          days,
          largestUnit,
          relativeTo
        ));
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.RoundDuration(
            years,
            months,
            weeks,
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            roundingIncrement,
            smallestUnit,
            roundingMode,
            relativeTo
          ));
        ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
          ES.AdjustRoundedDurationDays(
            years,
            months,
            weeks,
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            roundingIncrement,
            smallestUnit,
            roundingMode,
            relativeTo
          ));
        ({ years, months, weeks, days } = ES.BalanceDurationRelative(years, months, weeks, days, largestUnit, relativeTo));
        if (ES.IsTemporalZonedDateTime(relativeTo)) {
          relativeTo = ES.MoveRelativeZonedDateTime(relativeTo, years, months, weeks, 0);
        }
        ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit,
          relativeTo
        ));

        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      total(totalOf) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        let years = GetSlot(this, YEARS);
        let months = GetSlot(this, MONTHS);
        let weeks = GetSlot(this, WEEKS);
        let days = GetSlot(this, DAYS);
        let hours = GetSlot(this, HOURS);
        let minutes = GetSlot(this, MINUTES);
        let seconds = GetSlot(this, SECONDS);
        let milliseconds = GetSlot(this, MILLISECONDS);
        let microseconds = GetSlot(this, MICROSECONDS);
        let nanoseconds = GetSlot(this, NANOSECONDS);

        if (totalOf === undefined) throw new TypeError('options argument is required');
        if (ES.Type(totalOf) === 'String') {
          const stringParam = totalOf;
          totalOf = ObjectCreate$4(null);
          totalOf.unit = stringParam;
        } else {
          totalOf = ES.GetOptionsObject(totalOf);
        }
        const unit = ES.ToTemporalDurationTotalUnit(totalOf, undefined);
        if (unit === undefined) throw new RangeError('unit option is required');
        const relativeTo = ES.ToRelativeTemporalObject(totalOf);

        // Convert larger units down to days
        ({ years, months, weeks, days } = ES.UnbalanceDurationRelative(years, months, weeks, days, unit, relativeTo));
        // If the unit we're totalling is smaller than `days`, convert days down to that unit.
        let intermediate;
        if (ES.IsTemporalZonedDateTime(relativeTo)) {
          intermediate = ES.MoveRelativeZonedDateTime(relativeTo, years, months, weeks, 0);
        }
        ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          unit,
          intermediate
        ));
        // Finally, truncate to the correct unit and calculate remainder
        const { total } = ES.RoundDuration(
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          1,
          unit,
          'trunc',
          relativeTo
        );
        return total;
      }
      toString(options = undefined) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
        if (precision === 'minute') throw new RangeError('smallestUnit must not be "minute"');
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        return ES.TemporalDurationToString(this, precision, { unit, increment, roundingMode });
      }
      toJSON() {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDurationToString(this);
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
        if (typeof Intl !== 'undefined' && typeof Intl.DurationFormat !== 'undefined') {
          return new Intl.DurationFormat(locales, options).format(this);
        }
        console.warn('Temporal.Duration.prototype.toLocaleString() requires Intl.DurationFormat.');
        return ES.TemporalDurationToString(this);
      }
      valueOf() {
        throw new TypeError('use compare() to compare Temporal.Duration');
      }
      static from(item) {
        if (ES.IsTemporalDuration(item)) {
          return new Duration(
            GetSlot(item, YEARS),
            GetSlot(item, MONTHS),
            GetSlot(item, WEEKS),
            GetSlot(item, DAYS),
            GetSlot(item, HOURS),
            GetSlot(item, MINUTES),
            GetSlot(item, SECONDS),
            GetSlot(item, MILLISECONDS),
            GetSlot(item, MICROSECONDS),
            GetSlot(item, NANOSECONDS)
          );
        }
        return ES.ToTemporalDuration(item);
      }
      static compare(one, two, options = undefined) {
        one = ES.ToTemporalDuration(one);
        two = ES.ToTemporalDuration(two);
        options = ES.GetOptionsObject(options);
        const relativeTo = ES.ToRelativeTemporalObject(options);
        const y1 = GetSlot(one, YEARS);
        const mon1 = GetSlot(one, MONTHS);
        const w1 = GetSlot(one, WEEKS);
        let d1 = GetSlot(one, DAYS);
        const h1 = GetSlot(one, HOURS);
        const min1 = GetSlot(one, MINUTES);
        const s1 = GetSlot(one, SECONDS);
        const ms1 = GetSlot(one, MILLISECONDS);
        const µs1 = GetSlot(one, MICROSECONDS);
        let ns1 = GetSlot(one, NANOSECONDS);
        const y2 = GetSlot(two, YEARS);
        const mon2 = GetSlot(two, MONTHS);
        const w2 = GetSlot(two, WEEKS);
        let d2 = GetSlot(two, DAYS);
        const h2 = GetSlot(two, HOURS);
        const min2 = GetSlot(two, MINUTES);
        const s2 = GetSlot(two, SECONDS);
        const ms2 = GetSlot(two, MILLISECONDS);
        const µs2 = GetSlot(two, MICROSECONDS);
        let ns2 = GetSlot(two, NANOSECONDS);
        const shift1 = ES.CalculateOffsetShift(relativeTo, y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
        const shift2 = ES.CalculateOffsetShift(relativeTo, y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
        if (y1 !== 0 || y2 !== 0 || mon1 !== 0 || mon2 !== 0 || w1 !== 0 || w2 !== 0) {
          ({ days: d1 } = ES.UnbalanceDurationRelative(y1, mon1, w1, d1, 'day', relativeTo));
          ({ days: d2 } = ES.UnbalanceDurationRelative(y2, mon2, w2, d2, 'day', relativeTo));
        }
        ns1 = ES.TotalDurationNanoseconds(d1, h1, min1, s1, ms1, µs1, ns1, shift1);
        ns2 = ES.TotalDurationNanoseconds(d2, h2, min2, s2, ms2, µs2, ns2, shift2);
        return ES.ComparisonResult(ns1.minus(ns2).toJSNumber());
      }
    }

    MakeIntrinsicClass(Duration, 'Temporal.Duration');

    const ObjectCreate$3 = Object.create;

    class PlainMonthDay {
      constructor(isoMonth, isoDay, calendar = ES.GetISO8601Calendar(), referenceISOYear = 1972) {
        isoMonth = ES.ToIntegerThrowOnInfinity(isoMonth);
        isoDay = ES.ToIntegerThrowOnInfinity(isoDay);
        calendar = ES.ToTemporalCalendar(calendar);
        referenceISOYear = ES.ToIntegerThrowOnInfinity(referenceISOYear);

        // Note: if the arguments are not passed,
        //       ToIntegerThrowOnInfinity(undefined) will have returned 0, which will
        //       be rejected by RejectISODate in CreateTemporalMonthDaySlots. This
        //       check exists only to improve the error message.
        if (arguments.length < 2) {
          throw new RangeError('missing argument: isoMonth and isoDay are required');
        }

        ES.CreateTemporalMonthDaySlots(this, isoMonth, isoDay, calendar, referenceISOYear);
      }

      get monthCode() {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
      }
      get day() {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDay(GetSlot(this, CALENDAR), this);
      }
      get calendar() {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }

      with(temporalMonthDayLike, options = undefined) {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalMonthDayLike) !== 'Object') {
          throw new TypeError('invalid argument');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalMonthDayLike);

        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
        const props = ES.ToPartialRecord(temporalMonthDayLike, fieldNames);
        if (!props) {
          throw new TypeError('invalid month-day-like');
        }
        let fields = ES.ToTemporalMonthDayFields(this, fieldNames);
        fields = ES.CalendarMergeFields(calendar, fields, props);
        fields = ES.ToTemporalMonthDayFields(fields, fieldNames);

        options = ES.GetOptionsObject(options);
        return ES.MonthDayFromFields(calendar, fields, options);
      }
      equals(other) {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalMonthDay(other);
        for (const slot of [ISO_MONTH, ISO_DAY, ISO_YEAR]) {
          const val1 = GetSlot(this, slot);
          const val2 = GetSlot(other, slot);
          if (val1 !== val2) return false;
        }
        return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
      }
      toString(options = undefined) {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const showCalendar = ES.ToShowCalendarOption(options);
        return ES.TemporalMonthDayToString(this, showCalendar);
      }
      toJSON() {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return ES.TemporalMonthDayToString(this);
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use equals() to compare Temporal.PlainMonthDay');
      }
      toPlainDate(item) {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        if (ES.Type(item) !== 'Object') throw new TypeError('argument should be an object');
        const calendar = GetSlot(this, CALENDAR);

        const receiverFieldNames = ES.CalendarFields(calendar, ['day', 'monthCode']);
        let fields = ES.ToTemporalMonthDayFields(this, receiverFieldNames);

        const inputFieldNames = ES.CalendarFields(calendar, ['year']);
        const inputEntries = [['year', undefined]];
        // Add extra fields from the calendar at the end
        inputFieldNames.forEach((fieldName) => {
          if (!inputEntries.some(([name]) => name === fieldName)) {
            inputEntries.push([fieldName, undefined]);
          }
        });
        const inputFields = ES.PrepareTemporalFields(item, inputEntries);
        let mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);

        const mergedFieldNames = [...new Set([...receiverFieldNames, ...inputFieldNames])];
        const mergedEntries = [];
        mergedFieldNames.forEach((fieldName) => {
          if (!mergedEntries.some(([name]) => name === fieldName)) {
            mergedEntries.push([fieldName, undefined]);
          }
        });
        mergedFields = ES.PrepareTemporalFields(mergedFields, mergedEntries);
        const options = ObjectCreate$3(null);
        options.overflow = 'reject';
        return ES.DateFromFields(calendar, mergedFields, options);
      }
      getISOFields() {
        if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
        return {
          calendar: GetSlot(this, CALENDAR),
          isoDay: GetSlot(this, ISO_DAY),
          isoMonth: GetSlot(this, ISO_MONTH),
          isoYear: GetSlot(this, ISO_YEAR)
        };
      }
      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        if (ES.IsTemporalMonthDay(item)) {
          ES.ToTemporalOverflow(options); // validate and ignore
          return ES.CreateTemporalMonthDay(
            GetSlot(item, ISO_MONTH),
            GetSlot(item, ISO_DAY),
            GetSlot(item, CALENDAR),
            GetSlot(item, ISO_YEAR)
          );
        }
        return ES.ToTemporalMonthDay(item, options);
      }
    }

    MakeIntrinsicClass(PlainMonthDay, 'Temporal.PlainMonthDay');

    const instant = () => {
      const Instant = GetIntrinsic('%Temporal.Instant%');
      return new Instant(ES.SystemUTCEpochNanoSeconds());
    };
    const plainDateTime = (calendarLike, temporalTimeZoneLike = timeZone()) => {
      const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
      const calendar = ES.ToTemporalCalendar(calendarLike);
      const inst = instant();
      return ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, inst, calendar);
    };
    const plainDateTimeISO = (temporalTimeZoneLike = timeZone()) => {
      const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
      const calendar = ES.GetISO8601Calendar();
      const inst = instant();
      return ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, inst, calendar);
    };
    const zonedDateTime = (calendarLike, temporalTimeZoneLike = timeZone()) => {
      const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
      const calendar = ES.ToTemporalCalendar(calendarLike);
      return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), timeZone, calendar);
    };
    const zonedDateTimeISO = (temporalTimeZoneLike = timeZone()) => {
      return zonedDateTime(ES.GetISO8601Calendar(), temporalTimeZoneLike);
    };
    const plainDate = (calendarLike, temporalTimeZoneLike = timeZone()) => {
      return ES.TemporalDateTimeToDate(plainDateTime(calendarLike, temporalTimeZoneLike));
    };
    const plainDateISO = (temporalTimeZoneLike = timeZone()) => {
      return ES.TemporalDateTimeToDate(plainDateTimeISO(temporalTimeZoneLike));
    };
    const plainTimeISO = (temporalTimeZoneLike = timeZone()) => {
      return ES.TemporalDateTimeToTime(plainDateTimeISO(temporalTimeZoneLike));
    };
    const timeZone = () => {
      return ES.SystemTimeZone();
    };

    const Now = {
      instant,
      plainDateTime,
      plainDateTimeISO,
      plainDate,
      plainDateISO,
      plainTimeISO,
      timeZone,
      zonedDateTime,
      zonedDateTimeISO
    };
    Object.defineProperty(Now, Symbol.toStringTag, {
      value: 'Temporal.Now',
      writable: false,
      enumerable: false,
      configurable: true
    });

    /* global false */

    const ObjectAssign = Object.assign;
    const ObjectCreate$2 = Object.create;

    const DISALLOWED_UNITS$1 = ['year', 'month', 'week', 'day'];
    const MAX_INCREMENTS = {
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };

    function TemporalTimeToString(time, precision, options = undefined) {
      let hour = GetSlot(time, ISO_HOUR);
      let minute = GetSlot(time, ISO_MINUTE);
      let second = GetSlot(time, ISO_SECOND);
      let millisecond = GetSlot(time, ISO_MILLISECOND);
      let microsecond = GetSlot(time, ISO_MICROSECOND);
      let nanosecond = GetSlot(time, ISO_NANOSECOND);

      if (options) {
        const { unit, increment, roundingMode } = options;
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          increment,
          unit,
          roundingMode
        ));
      }

      hour = ES.ISODateTimePartString(hour);
      minute = ES.ISODateTimePartString(minute);
      const seconds = ES.FormatSecondsStringPart(second, millisecond, microsecond, nanosecond, precision);
      return `${hour}:${minute}${seconds}`;
    }

    class PlainTime {
      constructor(isoHour = 0, isoMinute = 0, isoSecond = 0, isoMillisecond = 0, isoMicrosecond = 0, isoNanosecond = 0) {
        isoHour = ES.ToIntegerThrowOnInfinity(isoHour);
        isoMinute = ES.ToIntegerThrowOnInfinity(isoMinute);
        isoSecond = ES.ToIntegerThrowOnInfinity(isoSecond);
        isoMillisecond = ES.ToIntegerThrowOnInfinity(isoMillisecond);
        isoMicrosecond = ES.ToIntegerThrowOnInfinity(isoMicrosecond);
        isoNanosecond = ES.ToIntegerThrowOnInfinity(isoNanosecond);

        ES.RejectTime(isoHour, isoMinute, isoSecond, isoMillisecond, isoMicrosecond, isoNanosecond);
        CreateSlots(this);
        SetSlot(this, ISO_HOUR, isoHour);
        SetSlot(this, ISO_MINUTE, isoMinute);
        SetSlot(this, ISO_SECOND, isoSecond);
        SetSlot(this, ISO_MILLISECOND, isoMillisecond);
        SetSlot(this, ISO_MICROSECOND, isoMicrosecond);
        SetSlot(this, ISO_NANOSECOND, isoNanosecond);
        SetSlot(this, CALENDAR, ES.GetISO8601Calendar());
      }

      get calendar() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }
      get hour() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_HOUR);
      }
      get minute() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MINUTE);
      }
      get second() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_SECOND);
      }
      get millisecond() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MILLISECOND);
      }
      get microsecond() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_MICROSECOND);
      }
      get nanosecond() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, ISO_NANOSECOND);
      }

      with(temporalTimeLike, options = undefined) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalTimeLike) !== 'Object') {
          throw new TypeError('invalid argument');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalTimeLike);

        options = ES.GetOptionsObject(options);
        const overflow = ES.ToTemporalOverflow(options);

        const props = ES.ToPartialRecord(temporalTimeLike, [
          'hour',
          'microsecond',
          'millisecond',
          'minute',
          'nanosecond',
          'second'
        ]);
        if (!props) {
          throw new TypeError('invalid time-like');
        }
        const fields = ES.ToTemporalTimeRecord(this);
        let { hour, minute, second, millisecond, microsecond, nanosecond } = ObjectAssign(fields, props);
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          overflow
        ));
        return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
      }
      add(temporalDurationLike) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        const duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        let hour = GetSlot(this, ISO_HOUR);
        let minute = GetSlot(this, ISO_MINUTE);
        let second = GetSlot(this, ISO_SECOND);
        let millisecond = GetSlot(this, ISO_MILLISECOND);
        let microsecond = GetSlot(this, ISO_MICROSECOND);
        let nanosecond = GetSlot(this, ISO_NANOSECOND);
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        ));
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          'reject'
        ));
        return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
      }
      subtract(temporalDurationLike) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        let duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        let hour = GetSlot(this, ISO_HOUR);
        let minute = GetSlot(this, ISO_MINUTE);
        let second = GetSlot(this, ISO_SECOND);
        let millisecond = GetSlot(this, ISO_MILLISECOND);
        let microsecond = GetSlot(this, ISO_MICROSECOND);
        let nanosecond = GetSlot(this, ISO_NANOSECOND);
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds
        ));
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          'reject'
        ));
        return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalTime(other);
        options = ES.GetOptionsObject(options);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$1, 'hour');
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS$1);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_INCREMENTS[smallestUnit], false);
        let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceTime(
          GetSlot(this, ISO_HOUR),
          GetSlot(this, ISO_MINUTE),
          GetSlot(this, ISO_SECOND),
          GetSlot(this, ISO_MILLISECOND),
          GetSlot(this, ISO_MICROSECOND),
          GetSlot(this, ISO_NANOSECOND),
          GetSlot(other, ISO_HOUR),
          GetSlot(other, ISO_MINUTE),
          GetSlot(other, ISO_SECOND),
          GetSlot(other, ISO_MILLISECOND),
          GetSlot(other, ISO_MICROSECOND),
          GetSlot(other, ISO_NANOSECOND)
        );
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.RoundDuration(
          0,
          0,
          0,
          0,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          roundingIncrement,
          smallestUnit,
          roundingMode
        ));
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalTime(other);
        options = ES.GetOptionsObject(options);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS$1, 'hour');
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS$1);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_INCREMENTS[smallestUnit], false);
        let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceTime(
          GetSlot(other, ISO_HOUR),
          GetSlot(other, ISO_MINUTE),
          GetSlot(other, ISO_SECOND),
          GetSlot(other, ISO_MILLISECOND),
          GetSlot(other, ISO_MICROSECOND),
          GetSlot(other, ISO_NANOSECOND),
          GetSlot(this, ISO_HOUR),
          GetSlot(this, ISO_MINUTE),
          GetSlot(this, ISO_SECOND),
          GetSlot(this, ISO_MILLISECOND),
          GetSlot(this, ISO_MICROSECOND),
          GetSlot(this, ISO_NANOSECOND)
        );
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.RoundDuration(
          0,
          0,
          0,
          0,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds,
          roundingIncrement,
          smallestUnit,
          ES.NegateTemporalRoundingMode(roundingMode)
        ));
        hours = -hours;
        minutes = -minutes;
        seconds = -seconds;
        milliseconds = -milliseconds;
        microseconds = -microseconds;
        nanoseconds = -nanoseconds;
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      round(roundTo) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        if (roundTo === undefined) throw new TypeError('options parameter is required');
        if (ES.Type(roundTo) === 'String') {
          const stringParam = roundTo;
          roundTo = ObjectCreate$2(null);
          roundTo.smallestUnit = stringParam;
        } else {
          roundTo = ES.GetOptionsObject(roundTo);
        }
        const smallestUnit = ES.ToSmallestTemporalUnit(roundTo, undefined, DISALLOWED_UNITS$1);
        if (smallestUnit === undefined) throw new RangeError('smallestUnit is required');
        const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo, MAX_INCREMENTS[smallestUnit], false);

        let hour = GetSlot(this, ISO_HOUR);
        let minute = GetSlot(this, ISO_MINUTE);
        let second = GetSlot(this, ISO_SECOND);
        let millisecond = GetSlot(this, ISO_MILLISECOND);
        let microsecond = GetSlot(this, ISO_MICROSECOND);
        let nanosecond = GetSlot(this, ISO_NANOSECOND);
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          roundingIncrement,
          smallestUnit,
          roundingMode
        ));

        return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
      }
      equals(other) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalTime(other);
        for (const slot of [ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND]) {
          const val1 = GetSlot(this, slot);
          const val2 = GetSlot(other, slot);
          if (val1 !== val2) return false;
        }
        return true;
      }

      toString(options = undefined) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        return TemporalTimeToString(this, precision, { unit, increment, roundingMode });
      }
      toJSON() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return TemporalTimeToString(this, 'auto');
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.PlainTime');
      }

      toPlainDateTime(temporalDate) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');

        temporalDate = ES.ToTemporalDate(temporalDate);
        const year = GetSlot(temporalDate, ISO_YEAR);
        const month = GetSlot(temporalDate, ISO_MONTH);
        const day = GetSlot(temporalDate, ISO_DAY);
        const calendar = GetSlot(temporalDate, CALENDAR);

        const hour = GetSlot(this, ISO_HOUR);
        const minute = GetSlot(this, ISO_MINUTE);
        const second = GetSlot(this, ISO_SECOND);
        const millisecond = GetSlot(this, ISO_MILLISECOND);
        const microsecond = GetSlot(this, ISO_MICROSECOND);
        const nanosecond = GetSlot(this, ISO_NANOSECOND);

        return ES.CreateTemporalDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
      }
      toZonedDateTime(item) {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');

        if (ES.Type(item) !== 'Object') {
          throw new TypeError('invalid argument');
        }

        const dateLike = item.plainDate;
        if (dateLike === undefined) {
          throw new TypeError('missing date property');
        }
        const temporalDate = ES.ToTemporalDate(dateLike);

        const timeZoneLike = item.timeZone;
        if (timeZoneLike === undefined) {
          throw new TypeError('missing timeZone property');
        }
        const timeZone = ES.ToTemporalTimeZone(timeZoneLike);

        const year = GetSlot(temporalDate, ISO_YEAR);
        const month = GetSlot(temporalDate, ISO_MONTH);
        const day = GetSlot(temporalDate, ISO_DAY);
        const calendar = GetSlot(temporalDate, CALENDAR);
        const hour = GetSlot(this, ISO_HOUR);
        const minute = GetSlot(this, ISO_MINUTE);
        const second = GetSlot(this, ISO_SECOND);
        const millisecond = GetSlot(this, ISO_MILLISECOND);
        const microsecond = GetSlot(this, ISO_MICROSECOND);
        const nanosecond = GetSlot(this, ISO_NANOSECOND);

        const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const dt = new PlainDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, 'compatible');
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
      }
      getISOFields() {
        if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
        return {
          calendar: GetSlot(this, CALENDAR),
          isoHour: GetSlot(this, ISO_HOUR),
          isoMicrosecond: GetSlot(this, ISO_MICROSECOND),
          isoMillisecond: GetSlot(this, ISO_MILLISECOND),
          isoMinute: GetSlot(this, ISO_MINUTE),
          isoNanosecond: GetSlot(this, ISO_NANOSECOND),
          isoSecond: GetSlot(this, ISO_SECOND)
        };
      }

      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        const overflow = ES.ToTemporalOverflow(options);
        if (ES.IsTemporalTime(item)) {
          return new PlainTime(
            GetSlot(item, ISO_HOUR),
            GetSlot(item, ISO_MINUTE),
            GetSlot(item, ISO_SECOND),
            GetSlot(item, ISO_MILLISECOND),
            GetSlot(item, ISO_MICROSECOND),
            GetSlot(item, ISO_NANOSECOND)
          );
        }
        return ES.ToTemporalTime(item, overflow);
      }
      static compare(one, two) {
        one = ES.ToTemporalTime(one);
        two = ES.ToTemporalTime(two);
        for (const slot of [ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND]) {
          const val1 = GetSlot(one, slot);
          const val2 = GetSlot(two, slot);
          if (val1 !== val2) return ES.ComparisonResult(val1 - val2);
        }
        return 0;
      }
    }

    MakeIntrinsicClass(PlainTime, 'Temporal.PlainTime');

    const ObjectCreate$1 = Object.create;

    const DISALLOWED_UNITS = ['week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'];

    class PlainYearMonth {
      constructor(isoYear, isoMonth, calendar = ES.GetISO8601Calendar(), referenceISODay = 1) {
        isoYear = ES.ToIntegerThrowOnInfinity(isoYear);
        isoMonth = ES.ToIntegerThrowOnInfinity(isoMonth);
        calendar = ES.ToTemporalCalendar(calendar);
        referenceISODay = ES.ToIntegerThrowOnInfinity(referenceISODay);

        // Note: if the arguments are not passed,
        //       ToIntegerThrowOnInfinity(undefined) will have returned 0, which will
        //       be rejected by RejectISODate in CreateTemporalYearMonthSlots. This
        //       check exists only to improve the error message.
        if (arguments.length < 2) {
          throw new RangeError('missing argument: isoYear and isoMonth are required');
        }

        ES.CreateTemporalYearMonthSlots(this, isoYear, isoMonth, calendar, referenceISODay);
      }
      get year() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarYear(GetSlot(this, CALENDAR), this);
      }
      get month() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
      }
      get monthCode() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
      }
      get calendar() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }
      get era() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEra(GetSlot(this, CALENDAR), this);
      }
      get eraYear() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
      }
      get daysInMonth() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
      }
      get daysInYear() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
      }
      get monthsInYear() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
      }
      get inLeapYear() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
      }
      with(temporalYearMonthLike, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalYearMonthLike) !== 'Object') {
          throw new TypeError('invalid argument');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalYearMonthLike);

        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['month', 'monthCode', 'year']);
        const props = ES.ToPartialRecord(temporalYearMonthLike, fieldNames);
        if (!props) {
          throw new TypeError('invalid year-month-like');
        }
        let fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        fields = ES.CalendarMergeFields(calendar, fields, props);
        fields = ES.ToTemporalYearMonthFields(fields, fieldNames);

        options = ES.GetOptionsObject(options);

        return ES.YearMonthFromFields(calendar, fields, options);
      }
      add(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        const duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        ({ days } = ES.BalanceDuration(days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 'day'));

        options = ES.GetOptionsObject(options);

        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
        const day = sign < 0 ? ES.ToPositiveInteger(ES.CalendarDaysInMonth(calendar, this)) : 1;
        const startDate = ES.DateFromFields(calendar, { ...fields, day });
        const optionsCopy = { ...options };
        const addedDate = ES.CalendarDateAdd(calendar, startDate, { ...duration, days }, options);
        const addedDateFields = ES.ToTemporalYearMonthFields(addedDate, fieldNames);

        return ES.YearMonthFromFields(calendar, addedDateFields, optionsCopy);
      }
      subtract(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        let duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        duration = {
          years: -duration.years,
          months: -duration.months,
          weeks: -duration.weeks,
          days: -duration.days,
          hours: -duration.hours,
          minutes: -duration.minutes,
          seconds: -duration.seconds,
          milliseconds: -duration.milliseconds,
          microseconds: -duration.microseconds,
          nanoseconds: -duration.nanoseconds
        };
        let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        ({ days } = ES.BalanceDuration(days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 'day'));

        options = ES.GetOptionsObject(options);

        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
        const day = sign < 0 ? ES.ToPositiveInteger(ES.CalendarDaysInMonth(calendar, this)) : 1;
        const startDate = ES.DateFromFields(calendar, { ...fields, day });
        const optionsCopy = { ...options };
        const addedDate = ES.CalendarDateAdd(calendar, startDate, { ...duration, days }, options);
        const addedDateFields = ES.ToTemporalYearMonthFields(addedDate, fieldNames);

        return ES.YearMonthFromFields(calendar, addedDateFields, optionsCopy);
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalYearMonth(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarID = ES.ToString(calendar);
        const otherCalendarID = ES.ToString(otherCalendar);
        if (calendarID !== otherCalendarID) {
          throw new RangeError(
            `cannot compute difference between months of ${calendarID} and ${otherCalendarID} calendars`
          );
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'month', DISALLOWED_UNITS);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS, 'year');
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, undefined, false);

        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const otherFields = ES.ToTemporalYearMonthFields(other, fieldNames);
        const thisFields = ES.ToTemporalYearMonthFields(this, fieldNames);
        const otherDate = ES.DateFromFields(calendar, { ...otherFields, day: 1 });
        const thisDate = ES.DateFromFields(calendar, { ...thisFields, day: 1 });

        const untilOptions = { ...options, largestUnit };
        const result = ES.CalendarDateUntil(calendar, thisDate, otherDate, untilOptions);
        if (smallestUnit === 'month' && roundingIncrement === 1) return result;

        let { years, months } = result;
        ({ years, months } = ES.RoundDuration(
          years,
          months,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          roundingIncrement,
          smallestUnit,
          roundingMode,
          thisDate
        ));

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(years, months, 0, 0, 0, 0, 0, 0, 0, 0);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalYearMonth(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarID = ES.ToString(calendar);
        const otherCalendarID = ES.ToString(otherCalendar);
        if (calendarID !== otherCalendarID) {
          throw new RangeError(
            `cannot compute difference between months of ${calendarID} and ${otherCalendarID} calendars`
          );
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'month', DISALLOWED_UNITS);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS, 'year');
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalRoundingIncrement(options, undefined, false);

        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const otherFields = ES.ToTemporalYearMonthFields(other, fieldNames);
        const thisFields = ES.ToTemporalYearMonthFields(this, fieldNames);
        const otherDate = ES.DateFromFields(calendar, { ...otherFields, day: 1 });
        const thisDate = ES.DateFromFields(calendar, { ...thisFields, day: 1 });

        const untilOptions = { ...options, largestUnit };
        let { years, months } = ES.CalendarDateUntil(calendar, thisDate, otherDate, untilOptions);
        const Duration = GetIntrinsic('%Temporal.Duration%');
        if (smallestUnit === 'month' && roundingIncrement === 1) {
          return new Duration(-years, -months, 0, 0, 0, 0, 0, 0, 0, 0);
        }
        ({ years, months } = ES.RoundDuration(
          years,
          months,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          roundingIncrement,
          smallestUnit,
          ES.NegateTemporalRoundingMode(roundingMode),
          thisDate
        ));

        return new Duration(-years, -months, 0, 0, 0, 0, 0, 0, 0, 0);
      }
      equals(other) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalYearMonth(other);
        for (const slot of [ISO_YEAR, ISO_MONTH, ISO_DAY]) {
          const val1 = GetSlot(this, slot);
          const val2 = GetSlot(other, slot);
          if (val1 !== val2) return false;
        }
        return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
      }
      toString(options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const showCalendar = ES.ToShowCalendarOption(options);
        return ES.TemporalYearMonthToString(this, showCalendar);
      }
      toJSON() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return ES.TemporalYearMonthToString(this);
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.PlainYearMonth');
      }
      toPlainDate(item) {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        if (ES.Type(item) !== 'Object') throw new TypeError('argument should be an object');
        const calendar = GetSlot(this, CALENDAR);

        const receiverFieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        let fields = ES.ToTemporalYearMonthFields(this, receiverFieldNames);

        const inputFieldNames = ES.CalendarFields(calendar, ['day']);
        const inputEntries = [['day']];
        // Add extra fields from the calendar at the end
        inputFieldNames.forEach((fieldName) => {
          if (!inputEntries.some(([name]) => name === fieldName)) {
            inputEntries.push([fieldName, undefined]);
          }
        });
        const inputFields = ES.PrepareTemporalFields(item, inputEntries);
        let mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);

        const mergedFieldNames = [...new Set([...receiverFieldNames, ...inputFieldNames])];
        const mergedEntries = [];
        mergedFieldNames.forEach((fieldName) => {
          if (!mergedEntries.some(([name]) => name === fieldName)) {
            mergedEntries.push([fieldName, undefined]);
          }
        });
        mergedFields = ES.PrepareTemporalFields(mergedFields, mergedEntries);
        const options = ObjectCreate$1(null);
        options.overflow = 'reject';
        return ES.DateFromFields(calendar, mergedFields, options);
      }
      getISOFields() {
        if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
        return {
          calendar: GetSlot(this, CALENDAR),
          isoDay: GetSlot(this, ISO_DAY),
          isoMonth: GetSlot(this, ISO_MONTH),
          isoYear: GetSlot(this, ISO_YEAR)
        };
      }
      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        if (ES.IsTemporalYearMonth(item)) {
          ES.ToTemporalOverflow(options); // validate and ignore
          return ES.CreateTemporalYearMonth(
            GetSlot(item, ISO_YEAR),
            GetSlot(item, ISO_MONTH),
            GetSlot(item, CALENDAR),
            GetSlot(item, ISO_DAY)
          );
        }
        return ES.ToTemporalYearMonth(item, options);
      }
      static compare(one, two) {
        one = ES.ToTemporalYearMonth(one);
        two = ES.ToTemporalYearMonth(two);
        return ES.CompareISODate(
          GetSlot(one, ISO_YEAR),
          GetSlot(one, ISO_MONTH),
          GetSlot(one, ISO_DAY),
          GetSlot(two, ISO_YEAR),
          GetSlot(two, ISO_MONTH),
          GetSlot(two, ISO_DAY)
        );
      }
    }

    MakeIntrinsicClass(PlainYearMonth, 'Temporal.PlainYearMonth');

    const ArrayPrototypePush = Array.prototype.push;
    const ObjectCreate = Object.create;

    class ZonedDateTime {
      constructor(epochNanoseconds, timeZone, calendar = ES.GetISO8601Calendar()) {
        // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
        //       to improve the error message.
        //       ToTemporalTimeZone(undefined) will end up calling TimeZone.from("undefined"), which
        //       could succeed.
        if (arguments.length < 1) {
          throw new TypeError('missing argument: epochNanoseconds is required');
        }
        epochNanoseconds = ES.ToBigInt(epochNanoseconds);
        timeZone = ES.ToTemporalTimeZone(timeZone);
        calendar = ES.ToTemporalCalendar(calendar);

        ES.CreateTemporalZonedDateTimeSlots(this, epochNanoseconds, timeZone, calendar);
      }
      get calendar() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, CALENDAR);
      }
      get timeZone() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(this, TIME_ZONE);
      }
      get year() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get month() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonth(GetSlot(this, CALENDAR), dateTime(this));
      }
      get monthCode() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthCode(GetSlot(this, CALENDAR), dateTime(this));
      }
      get day() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDay(GetSlot(this, CALENDAR), dateTime(this));
      }
      get hour() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_HOUR);
      }
      get minute() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_MINUTE);
      }
      get second() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_SECOND);
      }
      get millisecond() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_MILLISECOND);
      }
      get microsecond() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_MICROSECOND);
      }
      get nanosecond() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return GetSlot(dateTime(this), ISO_NANOSECOND);
      }
      get era() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEra(GetSlot(this, CALENDAR), dateTime(this));
      }
      get eraYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarEraYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get epochSeconds() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const value = GetSlot(this, EPOCHNANOSECONDS);
        return +value.divide(1e9);
      }
      get epochMilliseconds() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const value = GetSlot(this, EPOCHNANOSECONDS);
        return +value.divide(1e6);
      }
      get epochMicroseconds() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const value = GetSlot(this, EPOCHNANOSECONDS);
        return bigIntIfAvailable$1(value.divide(1e3));
      }
      get epochNanoseconds() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return bigIntIfAvailable$1(GetSlot(this, EPOCHNANOSECONDS));
      }
      get dayOfWeek() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), dateTime(this));
      }
      get dayOfYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get weekOfYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get hoursInDay() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const dt = dateTime(this);
        const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const year = GetSlot(dt, ISO_YEAR);
        const month = GetSlot(dt, ISO_MONTH);
        const day = GetSlot(dt, ISO_DAY);
        const today = new DateTime(year, month, day, 0, 0, 0, 0, 0, 0);
        const tomorrowFields = ES.AddISODate(year, month, day, 0, 0, 0, 1, 'reject');
        const tomorrow = new DateTime(tomorrowFields.year, tomorrowFields.month, tomorrowFields.day, 0, 0, 0, 0, 0, 0);
        const timeZone = GetSlot(this, TIME_ZONE);
        const todayNs = GetSlot(ES.BuiltinTimeZoneGetInstantFor(timeZone, today, 'compatible'), EPOCHNANOSECONDS);
        const tomorrowNs = GetSlot(ES.BuiltinTimeZoneGetInstantFor(timeZone, tomorrow, 'compatible'), EPOCHNANOSECONDS);
        return tomorrowNs.subtract(todayNs).toJSNumber() / 3.6e12;
      }
      get daysInWeek() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), dateTime(this));
      }
      get daysInMonth() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), dateTime(this));
      }
      get daysInYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get monthsInYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get inLeapYear() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), dateTime(this));
      }
      get offset() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.BuiltinTimeZoneGetOffsetStringFor(GetSlot(this, TIME_ZONE), GetSlot(this, INSTANT));
      }
      get offsetNanoseconds() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, INSTANT));
      }
      with(temporalZonedDateTimeLike, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        if (ES.Type(temporalZonedDateTimeLike) !== 'Object') {
          throw new TypeError('invalid zoned-date-time-like');
        }
        ES.RejectObjectWithCalendarOrTimeZone(temporalZonedDateTimeLike);

        options = ES.GetOptionsObject(options);
        const disambiguation = ES.ToTemporalDisambiguation(options);
        const offset = ES.ToTemporalOffset(options, 'prefer');

        const timeZone = GetSlot(this, TIME_ZONE);
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, [
          'day',
          'hour',
          'microsecond',
          'millisecond',
          'minute',
          'month',
          'monthCode',
          'nanosecond',
          'second',
          'year'
        ]);
        ArrayPrototypePush.call(fieldNames, 'offset');
        const props = ES.ToPartialRecord(temporalZonedDateTimeLike, fieldNames);
        if (!props) {
          throw new TypeError('invalid zoned-date-time-like');
        }
        const entries = [
          ['day', undefined],
          ['hour', 0],
          ['microsecond', 0],
          ['millisecond', 0],
          ['minute', 0],
          ['month', undefined],
          ['monthCode', undefined],
          ['nanosecond', 0],
          ['second', 0],
          ['year', undefined],
          ['offset'],
          ['timeZone']
        ];
        // Add extra fields from the calendar at the end
        fieldNames.forEach((fieldName) => {
          if (!entries.some(([name]) => name === fieldName)) {
            entries.push([fieldName, undefined]);
          }
        });
        let fields = ES.PrepareTemporalFields(this, entries);
        fields = ES.CalendarMergeFields(calendar, fields, props);
        fields = ES.PrepareTemporalFields(fields, entries);
        let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
          ES.InterpretTemporalDateTimeFields(calendar, fields, options);
        const offsetNs = ES.ParseOffsetString(fields.offset);
        const epochNanoseconds = ES.InterpretISODateTimeOffset(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          'option',
          offsetNs,
          timeZone,
          disambiguation,
          offset,
          /* matchMinute = */ false
        );

        return ES.CreateTemporalZonedDateTime(epochNanoseconds, GetSlot(this, TIME_ZONE), calendar);
      }
      withPlainDate(temporalDate) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');

        temporalDate = ES.ToTemporalDate(temporalDate);

        const year = GetSlot(temporalDate, ISO_YEAR);
        const month = GetSlot(temporalDate, ISO_MONTH);
        const day = GetSlot(temporalDate, ISO_DAY);
        let calendar = GetSlot(temporalDate, CALENDAR);
        const thisDt = dateTime(this);
        const hour = GetSlot(thisDt, ISO_HOUR);
        const minute = GetSlot(thisDt, ISO_MINUTE);
        const second = GetSlot(thisDt, ISO_SECOND);
        const millisecond = GetSlot(thisDt, ISO_MILLISECOND);
        const microsecond = GetSlot(thisDt, ISO_MICROSECOND);
        const nanosecond = GetSlot(thisDt, ISO_NANOSECOND);

        calendar = ES.ConsolidateCalendars(GetSlot(this, CALENDAR), calendar);
        const timeZone = GetSlot(this, TIME_ZONE);
        const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const dt = new PlainDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, 'compatible');
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
      }
      withPlainTime(temporalTime = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');

        const PlainTime = GetIntrinsic('%Temporal.PlainTime%');
        temporalTime = temporalTime == undefined ? new PlainTime() : ES.ToTemporalTime(temporalTime);

        const thisDt = dateTime(this);
        const year = GetSlot(thisDt, ISO_YEAR);
        const month = GetSlot(thisDt, ISO_MONTH);
        const day = GetSlot(thisDt, ISO_DAY);
        const calendar = GetSlot(this, CALENDAR);
        const hour = GetSlot(temporalTime, ISO_HOUR);
        const minute = GetSlot(temporalTime, ISO_MINUTE);
        const second = GetSlot(temporalTime, ISO_SECOND);
        const millisecond = GetSlot(temporalTime, ISO_MILLISECOND);
        const microsecond = GetSlot(temporalTime, ISO_MICROSECOND);
        const nanosecond = GetSlot(temporalTime, ISO_NANOSECOND);

        const timeZone = GetSlot(this, TIME_ZONE);
        const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const dt = new PlainDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          calendar
        );
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, 'compatible');
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
      }
      withTimeZone(timeZone) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        timeZone = ES.ToTemporalTimeZone(timeZone);
        return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
      }
      withCalendar(calendar) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        calendar = ES.ToTemporalCalendar(calendar);
        return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), GetSlot(this, TIME_ZONE), calendar);
      }
      add(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        options = ES.GetOptionsObject(options);
        const timeZone = GetSlot(this, TIME_ZONE);
        const calendar = GetSlot(this, CALENDAR);
        const epochNanoseconds = ES.AddZonedDateTime(
          GetSlot(this, INSTANT),
          timeZone,
          calendar,
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          options
        );
        return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
      }
      subtract(temporalDurationLike, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const duration = ES.ToLimitedTemporalDuration(temporalDurationLike);
        const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
        options = ES.GetOptionsObject(options);
        const timeZone = GetSlot(this, TIME_ZONE);
        const calendar = GetSlot(this, CALENDAR);
        const epochNanoseconds = ES.AddZonedDateTime(
          GetSlot(this, INSTANT),
          timeZone,
          calendar,
          -years,
          -months,
          -weeks,
          -days,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds,
          options
        );
        return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
      }
      until(other, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalZonedDateTime(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond');
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('hour', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', [], defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const roundingIncrement = ES.ToTemporalDateTimeRoundingIncrement(options, smallestUnit);

        const ns1 = GetSlot(this, EPOCHNANOSECONDS);
        const ns2 = GetSlot(other, EPOCHNANOSECONDS);
        let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
        if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
          // The user is only asking for a time difference, so return difference of instants.
          years = 0;
          months = 0;
          weeks = 0;
          days = 0;
          ({ seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
            ns1,
            ns2,
            roundingIncrement,
            smallestUnit,
            roundingMode
          ));
          ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            0,
            0,
            0,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            largestUnit
          ));
        } else {
          const timeZone = GetSlot(this, TIME_ZONE);
          if (!ES.TimeZoneEquals(timeZone, GetSlot(other, TIME_ZONE))) {
            throw new RangeError(
              "When calculating difference between time zones, largestUnit must be 'hours' " +
                'or smaller because day lengths can vary between time zones due to DST or time zone offset changes.'
            );
          }
          const untilOptions = { ...options, largestUnit };
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit, untilOptions));
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.RoundDuration(
              years,
              months,
              weeks,
              days,
              hours,
              minutes,
              seconds,
              milliseconds,
              microseconds,
              nanoseconds,
              roundingIncrement,
              smallestUnit,
              roundingMode,
              this
            ));
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.AdjustRoundedDurationDays(
              years,
              months,
              weeks,
              days,
              hours,
              minutes,
              seconds,
              milliseconds,
              microseconds,
              nanoseconds,
              roundingIncrement,
              smallestUnit,
              roundingMode,
              this
            ));
        }

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      }
      since(other, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalZonedDateTime(other);
        const calendar = GetSlot(this, CALENDAR);
        const otherCalendar = GetSlot(other, CALENDAR);
        const calendarId = ES.ToString(calendar);
        const otherCalendarId = ES.ToString(otherCalendar);
        if (calendarId !== otherCalendarId) {
          throw new RangeError(`cannot compute difference between dates of ${calendarId} and ${otherCalendarId} calendars`);
        }
        options = ES.GetOptionsObject(options);
        const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond');
        const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('hour', smallestUnit);
        const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', [], defaultLargestUnit);
        ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
        let roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        roundingMode = ES.NegateTemporalRoundingMode(roundingMode);
        const roundingIncrement = ES.ToTemporalDateTimeRoundingIncrement(options, smallestUnit);

        const ns1 = GetSlot(this, EPOCHNANOSECONDS);
        const ns2 = GetSlot(other, EPOCHNANOSECONDS);
        let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
        if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
          // The user is only asking for a time difference, so return difference of instants.
          years = 0;
          months = 0;
          weeks = 0;
          days = 0;
          ({ seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
            ns1,
            ns2,
            roundingIncrement,
            smallestUnit,
            roundingMode
          ));
          ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
            0,
            0,
            0,
            seconds,
            milliseconds,
            microseconds,
            nanoseconds,
            largestUnit
          ));
        } else {
          const timeZone = GetSlot(this, TIME_ZONE);
          if (!ES.TimeZoneEquals(timeZone, GetSlot(other, TIME_ZONE))) {
            throw new RangeError(
              "When calculating difference between time zones, largestUnit must be 'hours' " +
                'or smaller because day lengths can vary between time zones due to DST or time zone offset changes.'
            );
          }
          const untilOptions = { ...options, largestUnit };
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit, untilOptions));
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.RoundDuration(
              years,
              months,
              weeks,
              days,
              hours,
              minutes,
              seconds,
              milliseconds,
              microseconds,
              nanoseconds,
              roundingIncrement,
              smallestUnit,
              roundingMode,
              this
            ));
          ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
            ES.AdjustRoundedDurationDays(
              years,
              months,
              weeks,
              days,
              hours,
              minutes,
              seconds,
              milliseconds,
              microseconds,
              nanoseconds,
              roundingIncrement,
              smallestUnit,
              roundingMode,
              this
            ));
        }

        const Duration = GetIntrinsic('%Temporal.Duration%');
        return new Duration(
          -years,
          -months,
          -weeks,
          -days,
          -hours,
          -minutes,
          -seconds,
          -milliseconds,
          -microseconds,
          -nanoseconds
        );
      }
      round(roundTo) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        if (roundTo === undefined) throw new TypeError('options parameter is required');
        if (ES.Type(roundTo) === 'String') {
          const stringParam = roundTo;
          roundTo = ObjectCreate(null);
          roundTo.smallestUnit = stringParam;
        } else {
          roundTo = ES.GetOptionsObject(roundTo);
        }
        const smallestUnit = ES.ToSmallestTemporalUnit(roundTo, undefined, ['year', 'month', 'week']);
        if (smallestUnit === undefined) throw new RangeError('smallestUnit is required');
        const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
        const maximumIncrements = {
          day: 1,
          hour: 24,
          minute: 60,
          second: 60,
          millisecond: 1000,
          microsecond: 1000,
          nanosecond: 1000
        };
        const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo, maximumIncrements[smallestUnit], false);

        // first, round the underlying DateTime fields
        const dt = dateTime(this);
        let year = GetSlot(dt, ISO_YEAR);
        let month = GetSlot(dt, ISO_MONTH);
        let day = GetSlot(dt, ISO_DAY);
        let hour = GetSlot(dt, ISO_HOUR);
        let minute = GetSlot(dt, ISO_MINUTE);
        let second = GetSlot(dt, ISO_SECOND);
        let millisecond = GetSlot(dt, ISO_MILLISECOND);
        let microsecond = GetSlot(dt, ISO_MICROSECOND);
        let nanosecond = GetSlot(dt, ISO_NANOSECOND);

        const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const timeZone = GetSlot(this, TIME_ZONE);
        const calendar = GetSlot(this, CALENDAR);
        const dtStart = new DateTime(GetSlot(dt, ISO_YEAR), GetSlot(dt, ISO_MONTH), GetSlot(dt, ISO_DAY), 0, 0, 0, 0, 0, 0);
        const instantStart = ES.BuiltinTimeZoneGetInstantFor(timeZone, dtStart, 'compatible');
        const endNs = ES.AddZonedDateTime(instantStart, timeZone, calendar, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0);
        const dayLengthNs = endNs.subtract(GetSlot(instantStart, EPOCHNANOSECONDS));
        if (dayLengthNs.isZero()) {
          throw new RangeError('cannot round a ZonedDateTime in a calendar with zero-length days');
        }
        ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          roundingIncrement,
          smallestUnit,
          roundingMode,
          dayLengthNs
        ));

        // Now reset all DateTime fields but leave the TimeZone. The offset will
        // also be retained if the new date/time values are still OK with the old
        // offset. Otherwise the offset will be changed to be compatible with the
        // new date/time values. If DST disambiguation is required, the `compatible`
        // disambiguation algorithm will be used.
        const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, GetSlot(this, INSTANT));
        const epochNanoseconds = ES.InterpretISODateTimeOffset(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond,
          'option',
          offsetNs,
          timeZone,
          'compatible',
          'prefer',
          /* matchMinute = */ false
        );

        return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, GetSlot(this, CALENDAR));
      }
      equals(other) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        other = ES.ToTemporalZonedDateTime(other);
        const one = GetSlot(this, EPOCHNANOSECONDS);
        const two = GetSlot(other, EPOCHNANOSECONDS);
        if (!bigInt(one).equals(two)) return false;
        if (!ES.TimeZoneEquals(GetSlot(this, TIME_ZONE), GetSlot(other, TIME_ZONE))) return false;
        return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
      }
      toString(options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        options = ES.GetOptionsObject(options);
        const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
        const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
        const showCalendar = ES.ToShowCalendarOption(options);
        const showTimeZone = ES.ToShowTimeZoneNameOption(options);
        const showOffset = ES.ToShowOffsetOption(options);
        return ES.TemporalZonedDateTimeToString(this, precision, showCalendar, showTimeZone, showOffset, {
          unit,
          increment,
          roundingMode
        });
      }
      toLocaleString(locales = undefined, options = undefined) {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return new DateTimeFormat(locales, options).format(this);
      }
      toJSON() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalZonedDateTimeToString(this, 'auto');
      }
      valueOf() {
        throw new TypeError('use compare() or equals() to compare Temporal.ZonedDateTime');
      }
      startOfDay() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const dt = dateTime(this);
        const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
        const calendar = GetSlot(this, CALENDAR);
        const dtStart = new DateTime(
          GetSlot(dt, ISO_YEAR),
          GetSlot(dt, ISO_MONTH),
          GetSlot(dt, ISO_DAY),
          0,
          0,
          0,
          0,
          0,
          0,
          calendar
        );
        const timeZone = GetSlot(this, TIME_ZONE);
        const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dtStart, 'compatible');
        return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
      }
      toInstant() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
        return new TemporalInstant(GetSlot(this, EPOCHNANOSECONDS));
      }
      toPlainDate() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateTimeToDate(dateTime(this));
      }
      toPlainTime() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return ES.TemporalDateTimeToTime(dateTime(this));
      }
      toPlainDateTime() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        return dateTime(this);
      }
      toPlainYearMonth() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year']);
        const fields = ES.ToTemporalYearMonthFields(this, fieldNames);
        return ES.YearMonthFromFields(calendar, fields);
      }
      toPlainMonthDay() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const calendar = GetSlot(this, CALENDAR);
        const fieldNames = ES.CalendarFields(calendar, ['day', 'monthCode']);
        const fields = ES.ToTemporalMonthDayFields(this, fieldNames);
        return ES.MonthDayFromFields(calendar, fields);
      }
      getISOFields() {
        if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
        const dt = dateTime(this);
        const tz = GetSlot(this, TIME_ZONE);
        return {
          calendar: GetSlot(this, CALENDAR),
          isoDay: GetSlot(dt, ISO_DAY),
          isoHour: GetSlot(dt, ISO_HOUR),
          isoMicrosecond: GetSlot(dt, ISO_MICROSECOND),
          isoMillisecond: GetSlot(dt, ISO_MILLISECOND),
          isoMinute: GetSlot(dt, ISO_MINUTE),
          isoMonth: GetSlot(dt, ISO_MONTH),
          isoNanosecond: GetSlot(dt, ISO_NANOSECOND),
          isoSecond: GetSlot(dt, ISO_SECOND),
          isoYear: GetSlot(dt, ISO_YEAR),
          offset: ES.BuiltinTimeZoneGetOffsetStringFor(tz, GetSlot(this, INSTANT)),
          timeZone: tz
        };
      }
      static from(item, options = undefined) {
        options = ES.GetOptionsObject(options);
        if (ES.IsTemporalZonedDateTime(item)) {
          ES.ToTemporalOverflow(options); // validate and ignore
          ES.ToTemporalDisambiguation(options);
          ES.ToTemporalOffset(options, 'reject');
          return ES.CreateTemporalZonedDateTime(
            GetSlot(item, EPOCHNANOSECONDS),
            GetSlot(item, TIME_ZONE),
            GetSlot(item, CALENDAR)
          );
        }
        return ES.ToTemporalZonedDateTime(item, options);
      }
      static compare(one, two) {
        one = ES.ToTemporalZonedDateTime(one);
        two = ES.ToTemporalZonedDateTime(two);
        const ns1 = GetSlot(one, EPOCHNANOSECONDS);
        const ns2 = GetSlot(two, EPOCHNANOSECONDS);
        if (bigInt(ns1).lesser(ns2)) return -1;
        if (bigInt(ns1).greater(ns2)) return 1;
        return 0;
      }
    }

    MakeIntrinsicClass(ZonedDateTime, 'Temporal.ZonedDateTime');

    function bigIntIfAvailable$1(wrapper) {
      return typeof BigInt === 'undefined' ? wrapper : wrapper.value;
    }

    function dateTime(zdt) {
      return ES.BuiltinTimeZoneGetPlainDateTimeFor(GetSlot(zdt, TIME_ZONE), GetSlot(zdt, INSTANT), GetSlot(zdt, CALENDAR));
    }

    /* global false */

    {
      // eslint-disable-next-line no-console
      console.warn(
        'This polyfill should only be used to run tests or to experiment in the browser devtools console.\n' +
          'To polyfill Temporal in your own projects, see https://github.com/tc39/proposal-temporal#polyfills.'
      );
    }

    var Temporal = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Instant: Instant,
        Calendar: Calendar,
        PlainDate: PlainDate,
        PlainDateTime: PlainDateTime,
        Duration: Duration,
        PlainMonthDay: PlainMonthDay,
        Now: Now,
        PlainTime: PlainTime,
        TimeZone: TimeZone,
        PlainYearMonth: PlainYearMonth,
        ZonedDateTime: ZonedDateTime
    });

    function toTemporalInstant() {
      // Observable access to valueOf is not correct here, but unavoidable
      const epochNanoseconds = bigInt(+this).multiply(1e6);
      return new Instant(bigIntIfAvailable(epochNanoseconds));
    }

    function bigIntIfAvailable(wrapper) {
      return typeof BigInt === 'undefined' ? wrapper : wrapper.value;
    }

    // This is an alternate entry point that polyfills Temporal onto the global

    Object.defineProperty(globalThis, 'Temporal', {
      value: {},
      writable: true,
      enumerable: false,
      configurable: true
    });
    copy(globalThis.Temporal, Temporal);
    Object.defineProperty(globalThis.Temporal, Symbol.toStringTag, {
      value: 'Temporal',
      writable: false,
      enumerable: false,
      configurable: true
    });
    copy(globalThis.Temporal.Now, Now);
    copy(globalThis.Intl, Intl$1);
    Object.defineProperty(globalThis.Date.prototype, 'toTemporalInstant', {
      value: toTemporalInstant,
      writable: true,
      enumerable: false,
      configurable: true
    });

    function copy(target, source) {
      for (const prop of Object.getOwnPropertyNames(source)) {
        Object.defineProperty(target, prop, {
          value: source[prop],
          writable: true,
          enumerable: false,
          configurable: true
        });
      }
    }

    exports.Intl = Intl$1;
    exports.Temporal = Temporal;
    exports.toTemporalInstant = toTemporalInstant;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=script.js.map
