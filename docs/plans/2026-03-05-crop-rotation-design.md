# Crop Selection Rotation Design

## Scope
- Add free-angle rotation support for crop selection.
- Use Photoshop-like UX: rotation handles at 4 corners, click-and-drag to rotate.
- Keep existing crop create/move/clear flows intact.

## Interaction Model
- Crop selection state keeps `x/y/w/h` and `rotation` (radians).
- In crop mode:
  - Drag corner handle => rotate around crop center.
  - Drag inside rotated crop => move crop.
  - Drag empty area => create new crop (rotation reset to 0).
- Label shows width/height plus current angle in degrees.

## Rendering
- Render crop overlay with canvas transform around center.
- Render four corner rotation handles.
- Use rotated-rect hit testing for interaction.

## Data Flow Changes
- Replace axis-aligned crop extraction with rotated-crop extraction canvas.
- Reuse extracted rotated source in:
  - copy crop
  - create layer from crop
  - AI source `crop`
- Deleting crop content on active layer uses rotated rectangle mask.

## Risk & Mitigation
- Risk: boundary/hit-test regressions.
  - Mitigation: add geometry utility tests.
- Risk: crop-intersection behavior mismatch.
  - Mitigation: explicit rotated-vs-layer intersection check before actions.

## Validation
- `npm test`
- `npm run typecheck`
- `npm run build`
- Manual: create/move/rotate crop, copy/paste, create layer, AI source crop.
