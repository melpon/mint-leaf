"use client";

import { Locale } from '@/context/LanguageContext'
import { DataAction } from './types'
import { buildActionSearchQuery, convertBetaIconPath, getObject, xivapiSearch } from './xivapi'

const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

export const searchForAction = async (nameQuery: string, language: Locale): Promise<DataAction[]> => {
    if (nameQuery === "") return [];

    const query = buildActionSearchQuery(nameQuery, language);
    const { results } = await xivapiSearch(['Action', 'Item'], query, language);

    return results.map(({ row_id, fields, sheet }) => ({
        id: (sheet === 'Item' ? 'item-' : '') + row_id.toString(),
        name: fields.Name,
        icon: fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null,
    })).filter(({ icon }) =>
        icon && icon.toString() !== defaultIcon
    );
}

export const getActionByID = async (id: string, language: Locale): Promise<DataAction> => {
    try {
        const isCustom = id.startsWith('custom-');

        if (isCustom) {
            const [_, icon, name] = decodeURI(id).split('-');
            return {
                id: id,
                name: name,
                icon: new URL(icon),
            };
        }

        const isItem = id.startsWith('item-');
        const parsedId = parseInt(id.replace('item-', ''))

        const { fields } = await getObject(isItem ? 'Item' : 'Action', parsedId, language);
        const icon = fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null;
        const name = fields.Name;

        return { id, name, icon };
    } catch (e) {
        throw new Error(`No action with ID ${id} exists`);
    }
}
