import { EnumField, EnumType } from '../types.ts';

function defineEnum(enumFields: EnumField[]): EnumType {
    const enumType: EnumType = {
        values: {},
        descriptions: {},
        display: {},

        list() {
            return Object.keys(this.values);
        },

        isValidValue(value: string) {
            return value in this.values;
        },

        isValidValueName(valueName: string) {
            return valueName in this && typeof this[valueName] === 'string';
        },

        length: 0,
    };

    for (const field of enumFields) {
        enumType[field.name] = field.value;
        enumType.values[field.value] = field.name;
        enumType.descriptions[field.value] = field.description;
        enumType.display[field.value] = field.display || field.name;
    }

    enumType.length = Object.keys(enumType.values).length;

    return Object.freeze(enumType);
}

export default defineEnum;
