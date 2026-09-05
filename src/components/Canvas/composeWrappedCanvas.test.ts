import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/fonts', () => ({
    roboto: { style: { fontFamily: 'Roboto' } },
    kumbh: { style: { fontFamily: 'Kumbh Sans' } },
}))

import { measureContentTop, measureWrappedCanvasSize } from './composeWrappedCanvas'
import { layoutInfographic } from './layoutInfographic'
import { Action } from './types'
import { TextMeasurer } from './textLayout'

const measurer: TextMeasurer = {
    measure(text, font) {
        const size = Number.parseFloat(font.match(/([\d.]+)px/)?.[1] ?? '16')
        const width = Array.from(text).reduce((sum, character) => sum + (/[MW]/.test(character) ? 0.8 : /[il]/.test(character) ? 0.25 : 0.52) * size, 0)
        return {
            width,
            actualBoundingBoxAscent: size * 0.76,
            actualBoundingBoxDescent: size * 0.2,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
        }
    },
}

const baseInput = {
    prepullRotation: [] as Action[],
    rotation: [] as Action[],
    title: 'Title',
    jobName: 'Dark Knight',
    jobIcon: '/job-icons/drk.svg',
    level: 100,
    expansion: 'Dawntrail',
    patch: '7.4',
    useBalanceLogo: false,
}

describe('composeWrappedCanvas', () => {
    it('places content below the header chrome', () => {
        const plan = layoutInfographic({
            ...baseInput,
            rotation: [{ id: 'g1', type: 'gcd', name: 'First GCD', imageSrc: '/favicon.ico' }],
        }, measurer)
        const contentTop = measureContentTop(plan)
        expect(contentTop).toBeGreaterThan(0)
        const headerBottom = Math.max(
            ...plan.primitives
                .filter(primitive => primitive.id.startsWith('header-') || primitive.id === 'job-icon')
                .map(primitive => primitive.bounds.y + primitive.bounds.height),
        )
        expect(contentTop).toBeGreaterThanOrEqual(headerBottom)
    })

    it('sizes the wrapped canvas from strip width and row spacing', () => {
        const wrapWidth = 400
        const rowSpacing = 300
        const stripWidth = 1000
        const stripHeight = 200
        const contentTop = 40
        const size = measureWrappedCanvasSize(
            stripWidth,
            stripHeight,
            contentTop,
            wrapWidth,
            rowSpacing,
        )
        const rowCount = Math.ceil(stripWidth / wrapWidth)
        const contentHeight = stripHeight - contentTop
        expect(size.width).toBe(wrapWidth)
        expect(size.height).toBe(contentTop + contentHeight + (rowCount - 1) * rowSpacing)
    })
})
