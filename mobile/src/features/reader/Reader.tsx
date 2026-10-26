import { memo, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native'
import type { PublicNote } from '../../api/types'
import { colors, fonts } from '../../theme'
import { saveLastOpened } from './lastOpened'
import { PaperFooter, PaperHeader, PaperItem } from './Paper'
import type { RenderItem } from './renderItems'
import { PAGE_PADDING, usePages } from './usePages'

type Size = { width: number; height: number }

// Reader (PLAN §7): the note as pages that fit the screen, swiped left like a book.
// The 3D page-turn animation replaces the plain horizontal swipe in phase 3b.
export function Reader({ note, initialPage = 0 }: { note: PublicNote; initialPage?: number }) {
  const [size, setSize] = useState<Size | null>(null)
  const { fontScale } = useWindowDimensions()

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }))
  }

  return (
    <View style={styles.area} onLayout={onLayout}>
      {size && (
        // Remount on anything that changes the layout: new pages are measured from scratch.
        <PagedNote
          key={`${note.id}:${note.contentVersion}:${Math.round(size.width)}x${Math.round(size.height)}:${fontScale}`}
          note={note}
          size={size}
          initialPage={initialPage}
        />
      )}
    </View>
  )
}

function PagedNote({ note, size, initialPage }: { note: PublicNote; size: Size; initialPage: number }) {
  const [result, measurer] = usePages(note, size.width, size.height - CONTROLS_HEIGHT)
  const [page, setPage] = useState(0)
  const scroller = useRef<ScrollViewInstance>(null)
  const pages = result.status === 'ready' ? result.pages : []
  const pageCount = pages.length

  // Open on the remembered page (or the last one, if the layout now has fewer). Once only:
  // after that the reader's own swipes decide the page.
  const positioned = useRef(false)
  useEffect(() => {
    if (pageCount === 0 || positioned.current) return
    positioned.current = true
    const start = Math.min(initialPage, pageCount - 1)
    setPage(start)
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: start * size.width, animated: false }))
  }, [pageCount, initialPage, size.width])

  useEffect(() => {
    if (pageCount > 0) saveLastOpened({ noteId: note.id, title: note.title, page })
  }, [note.id, note.title, page, pageCount])

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(pageCount - 1, target))
    scroller.current?.scrollTo({ x: clamped * size.width, animated: true })
    setPage(clamped)
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / size.width))
  }

  return (
    <View style={styles.fill}>
      {measurer}
      {result.status === 'measuring' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={styles.fill}
          >
            {pages.map((items, index) => (
              <View key={index} style={{ width: size.width, height: size.height - CONTROLS_HEIGHT }}>
                <Page note={note} items={items} index={index} count={pageCount} />
              </View>
            ))}
          </ScrollView>
          <View style={styles.controls}>
            <PageButton label="‹" accessibilityLabel="Previous page" disabled={page === 0} onPress={() => goTo(page - 1)} />
            <Text style={styles.pageCount} accessibilityLiveRegion="polite">
              {pageCount === 0 ? 'Empty note' : `${page + 1} / ${pageCount}`}
            </Text>
            <PageButton
              label="›"
              accessibilityLabel="Next page"
              disabled={page >= pageCount - 1}
              onPress={() => goTo(page + 1)}
            />
          </View>
        </>
      )}
    </View>
  )
}

const Page = memo(function Page({ note, items, index, count }: { note: PublicNote; items: RenderItem[]; index: number; count: number }) {
  return (
    <View style={styles.sheet} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      <PaperHeader title={note.title} coverImageUrl={note.coverImageUrl} continued={index > 0} />
      {/* Clipped: a block that could not be split (no line measurements) must never draw over the footer. */}
      <View style={styles.pageBody}>
        {items.map((item) => (
          <PaperItem key={item.key} item={item} />
        ))}
      </View>
      <PaperFooter preacherName={note.preacherName} sermonDate={note.sermonDate} showOver={index < count - 1} />
    </View>
  )
})

function PageButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string
  accessibilityLabel: string
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pageButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.pageButtonText}>{label}</Text>
    </Pressable>
  )
}

const CONTROLS_HEIGHT = 56

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: colors.backdrop },
  fill: { flex: 1 },
  pageBody: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    flex: 1,
    margin: 0,
    padding: PAGE_PADDING,
    backgroundColor: colors.paper,
  },
  controls: {
    height: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.backdrop,
  },
  pageCount: { fontFamily: fonts.sans, fontSize: 15, color: colors.navy },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  pageButtonText: { color: colors.surface, fontSize: 24, lineHeight: 26 },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
})
