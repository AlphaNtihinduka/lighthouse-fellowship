import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, uploadCoverImage } from '../../api/endpoints'
import type { AdminNote } from '../../api/types'

const MAX_BYTES = 10 * 1024 * 1024

// Uploads go dashboard → backend → Cloudinary; no Cloudinary key is in the browser.
export function CoverImageField({ note, onSaved }: { note: AdminNote | null; onSaved: (note: AdminNote) => void }) {
  const queryClient = useQueryClient()
  const upload = useMutation({
    mutationFn: (file: File) => {
      if (!note) throw new Error('Save the note first.')
      if (file.size > MAX_BYTES) throw new Error('The image is larger than 10 MB.')
      return uploadCoverImage(note.id, file)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.note(updated.id), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.allNotes })
      onSaved(updated)
    },
  })

  return (
    <div className="field">
      <label htmlFor="cover">Cover picture</label>
      {note?.coverImageUrl && <img className="cover-thumb" src={note.coverImageUrl} alt="Current cover" />}
      {note ? (
        <input
          id="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={upload.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) upload.mutate(file)
            event.target.value = ''
          }}
        />
      ) : (
        <span className="field__hint">Save the note first, then add a picture.</span>
      )}
      {upload.isPending && <span className="field__hint">Uploading…</span>}
      {upload.isError && (
        <span className="field__hint field__hint--error" role="alert">
          {upload.error.message}
        </span>
      )}
      <span className="field__hint">JPEG, PNG or WebP, up to 10 MB.</span>
    </div>
  )
}
