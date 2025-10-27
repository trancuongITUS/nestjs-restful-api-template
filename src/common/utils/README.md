# Global Utilities Documentation

## 📋 **Overview**

This directory contains global utility functions that can be used throughout the entire application. These utilities follow the **Single Responsibility Principle** and are organized by category for better maintainability.

## 🗂️ **File Structure**

```
src/common/utils/
├── index.ts           # Main export file for all utilities
├── type.util.ts       # Type checking and validation utilities
├── object.util.ts     # Object manipulation utilities
├── logger.util.ts     # Logging utilities (existing)
└── README.md          # This documentation
```

## 🔍 **Type Utilities (`type.util.ts`)**

### **Basic Type Checking**

```typescript
import {
    isString,
    isNumber,
    isBoolean,
    isNullOrUndefined,
} from '@/common/utils';

// Type guards with proper TypeScript inference
if (isString(value)) {
    // value is now typed as string
    console.log(value.toUpperCase());
}

if (isNumber(value)) {
    // value is now typed as number
    console.log(value.toFixed(2));
}
```

### **Advanced Type Checking**

```typescript
import {
    isPrimitive,
    isEmpty,
    isDefined,
    isObject,
    isArray,
} from '@/common/utils';

// Check for primitive types (string | number | boolean)
if (isPrimitive(value)) {
    // Safe to convert to string
    const str = String(value);
}

// Check if value is empty (null, undefined, '', [], {})
if (!isEmpty(userInput)) {
    // Process non-empty input
}

// Check if value is defined (not null/undefined)
if (isDefined(config.apiKey)) {
    // config.apiKey is guaranteed to be non-null/undefined
    makeApiCall(config.apiKey);
}
```

### **Available Type Utilities**

| Function                   | Description                                           | Return Type                                |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `isNullOrUndefined(value)` | Check if value is null or undefined                   | `value is null \| undefined`               |
| `isString(value)`          | Check if value is a string                            | `value is string`                          |
| `isNumber(value)`          | Check if value is a number                            | `value is number`                          |
| `isBoolean(value)`         | Check if value is a boolean                           | `value is boolean`                         |
| `isPrimitive(value)`       | Check if value is string, number, or boolean          | `value is string \| number \| boolean`     |
| `isEmptyString(value)`     | Check if value is an empty string                     | `value is ''`                              |
| `isObject(value)`          | Check if value is an object (excluding null/arrays)   | `value is Record<string, unknown>`         |
| `isArray(value)`           | Check if value is an array                            | `value is unknown[]`                       |
| `isFunction(value)`        | Check if value is a function                          | `value is (...args: unknown[]) => unknown` |
| `isDefined(value)`         | Check if value is not null and not undefined          | `value is T`                               |
| `isEmpty(value)`           | Check if value is empty (null, undefined, '', [], {}) | `boolean`                                  |

## 🛠️ **Object Utilities (`object.util.ts`)**

### **Options Merging**

```typescript
import { mergeOptions } from '@/common/utils';

interface MyOptions {
    timeout: number;
    retries: number;
    debug: boolean;
}

const defaults: Required<MyOptions> = {
    timeout: 5000,
    retries: 3,
    debug: false,
};

const userOptions: Partial<MyOptions> = {
    timeout: 10000,
    // retries and debug will use defaults
};

const finalOptions = mergeOptions(defaults, userOptions);
// Result: { timeout: 10000, retries: 3, debug: false }
```

### **Object Manipulation**

```typescript
import { pick, omit, deepClone, hasProperty } from '@/common/utils';

const user = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    password: 'secret',
    role: 'admin',
};

// Pick specific properties
const publicUser = pick(user, ['id', 'name', 'email']);
// Result: { id: 1, name: 'John', email: 'john@example.com' }

// Omit sensitive properties
const safeUser = omit(user, ['password']);
// Result: { id: 1, name: 'John', email: 'john@example.com', role: 'admin' }

// Deep clone objects
const clonedUser = deepClone(user);

// Check if object has property
if (hasProperty(user, 'email')) {
    // user.email is now typed as unknown but exists
    sendEmail(user.email);
}
```

### **Available Object Utilities**

| Function                             | Description                      | Use Case               |
| ------------------------------------ | -------------------------------- | ---------------------- |
| `mergeOptions<T>(defaults, options)` | Merge user options with defaults | Configuration merging  |
| `deepClone<T>(obj)`                  | Create deep copy of object       | Immutable operations   |
| `pick<T, K>(obj, keys)`              | Extract specific properties      | API response filtering |
| `omit<T, K>(obj, keys)`              | Remove specific properties       | Sensitive data removal |
| `hasProperty<T, K>(obj, property)`   | Check if object has property     | Safe property access   |

## 🚀 **Usage Examples**

### **In Controllers**

```typescript
import { isString, isNullOrUndefined, isEmpty } from '@/common/utils';

@Controller('users')
export class UserController {
    @Get('search')
    search(@Query('q') query: unknown) {
        if (!isString(query) || isEmpty(query)) {
            throw new BadRequestException('Query must be a non-empty string');
        }

        // query is now typed as string and guaranteed non-empty
        return this.userService.search(query);
    }
}
```

### **In Services**

```typescript
import { mergeOptions, isDefined, pick } from '@/common/utils';

@Injectable()
export class UserService {
    private readonly defaultOptions = {
        includeDeleted: false,
        limit: 10,
        sortBy: 'createdAt' as const,
    };

    findMany(options: Partial<typeof this.defaultOptions> = {}) {
        const finalOptions = mergeOptions(this.defaultOptions, options);

        // Use finalOptions with guaranteed defaults
        return this.repository.find(finalOptions);
    }

    async updateUser(id: string, updateData: Partial<User>) {
        const existingUser = await this.findById(id);

        if (!isDefined(existingUser)) {
            throw new NotFoundException('User not found');
        }

        // Return only safe properties
        const updatedUser = await this.repository.update(id, updateData);
        return pick(updatedUser, ['id', 'name', 'email', 'role']);
    }
}
```

### **In Validation**

```typescript
import { isString, isNumber, isEmpty, isPrimitive } from '@/common/utils';

export class CustomValidator {
    static validateInput(value: unknown): string {
        if (isNullOrUndefined(value)) {
            throw new Error('Value is required');
        }

        if (!isPrimitive(value)) {
            throw new Error('Value must be a primitive type');
        }

        const stringValue = String(value);

        if (isEmpty(stringValue)) {
            throw new Error('Value cannot be empty');
        }

        return stringValue;
    }
}
```

## 🎯 **Benefits**

### **✅ Type Safety**

- All utilities provide proper TypeScript type guards
- IntelliSense support with accurate type inference
- Compile-time error detection

### **✅ Consistency**

- Standardized type checking across the application
- Consistent object manipulation patterns
- Unified error handling approaches

### **✅ Reusability**

- Available throughout the entire application
- No code duplication for common operations
- Easy to extend with new utilities

### **✅ Performance**

- Optimized implementations
- No unnecessary object creation
- Efficient type checking algorithms

## 📝 **Best Practices**

1. **Import from the index**: Always import from `@/common/utils` for consistency
2. **Use type guards**: Leverage TypeScript's type narrowing with these utilities
3. **Prefer utilities over manual checks**: Use `isEmpty()` instead of multiple manual checks
4. **Chain utilities**: Combine utilities for complex validation logic
5. **Document custom usage**: Add JSDoc comments when using utilities in complex ways

## 🔮 **Extending Utilities**

When adding new utilities:

1. **Choose the right file**: Add to existing files or create new category files
2. **Follow naming conventions**: Use descriptive, verb-based names
3. **Add proper types**: Include TypeScript type guards where applicable
4. **Update exports**: Add to the appropriate export file
5. **Document thoroughly**: Include JSDoc comments and usage examples
6. **Write tests**: Ensure comprehensive test coverage

Example of adding a new utility:

```typescript
// In src/common/utils/string.util.ts
/**
 * Convert string to title case
 * @example toTitleCase('hello world') // 'Hello World'
 */
export function toTitleCase(str: string): string {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
}

// In src/common/utils/index.ts
export * from './string.util';
```
