import * as alt from 'alt-server';

import { PluginSystem } from '../plugins';
import { Athena } from '@AthenaServer/api/athena';
import { ClothingInfo, StoredItem } from '@AthenaShared/interfaces/item';

/**
 * THIS IS A DEFAULT SYSTEM.
 * IF YOU WANT TO DISABLE IT, MAKE A PLUGIN AND DISABLE IT THROUGH:
 * `Athena.systems.default.x.disable()`
 *
 * DO NOT APPEND ANY ADDITIONAL DATA TO THIS SYSTEM.
 * COPY THE CODE AND REMAKE IT AS A PLUGIN IF YOU WANT TO MAKE CHANGES.
 */

const SYSTEM_NAME = 'Clothing Crafting';

let enabled = true;

const Internal = {
    combineData(item1: StoredItem<ClothingInfo>, item2: StoredItem<ClothingInfo>): Required<ClothingInfo> | undefined {
        if (item1.data.sex !== item2.data.sex) {
            return undefined;
        }

        const data: ClothingInfo = {
            sex: item1.data.sex,
            components: [],
        };

        data.components = data.components.concat(item1.data.components, item2.data.components);
        return data;
    },
    async init() {
        if (!enabled) {
            return;
        }

        Athena.systems.itemCrafting.recipe.add({
            uid: `clothing`,
            combo: ['clothing', 'clothing'],
            quantities: [1, 1],
            result: {
                dbName: 'clothing',
                quantity: 1,
                data: Internal.combineData,
            },
            sound: 'item_clothing_combine',
        });

        alt.log(`~lc~Default System: ~g~${SYSTEM_NAME}`);
    },
};

export const DefaultClothingCrafting = {
    disable: () => {
        enabled = false;
        alt.log(`~y~Default ${SYSTEM_NAME} Turned Off`);
    },
};

PluginSystem.callback.add(Internal.init);