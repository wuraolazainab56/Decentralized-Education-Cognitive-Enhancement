;; Enhancement Protocol Contract
;; Records cognitive enhancement methodologies

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_NOT_FOUND (err u201))
(define-constant ERR_INVALID_PROTOCOL (err u202))

;; Protocol types
(define-constant PROTOCOL_MEMORY u1)
(define-constant PROTOCOL_ATTENTION u2)
(define-constant PROTOCOL_PROCESSING u3)
(define-constant PROTOCOL_LEARNING u4)
(define-constant PROTOCOL_CREATIVITY u5)

;; Data structures
(define-map protocols
  { protocol-id: uint }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    protocol-type: uint,
    methodology: (string-ascii 1000),
    duration-weeks: uint,
    institution-id: uint,
    created-by: principal,
    created-at: uint,
    is-active: bool
  }
)

(define-map protocol-versions
  { protocol-id: uint, version: uint }
  {
    changes: (string-ascii 500),
    updated-by: principal,
    updated-at: uint
  }
)

(define-data-var next-protocol-id uint u1)

;; Create a new enhancement protocol
(define-public (create-protocol
  (name (string-ascii 100))
  (description (string-ascii 500))
  (protocol-type uint)
  (methodology (string-ascii 1000))
  (duration-weeks uint)
  (institution-id uint))
  (let ((protocol-id (var-get next-protocol-id)))
    (asserts! (<= protocol-type PROTOCOL_CREATIVITY) ERR_INVALID_PROTOCOL)
    (asserts! (> duration-weeks u0) ERR_INVALID_PROTOCOL)

    (map-set protocols
      { protocol-id: protocol-id }
      {
        name: name,
        description: description,
        protocol-type: protocol-type,
        methodology: methodology,
        duration-weeks: duration-weeks,
        institution-id: institution-id,
        created-by: tx-sender,
        created-at: block-height,
        is-active: true
      }
    )
    (var-set next-protocol-id (+ protocol-id u1))
    (ok protocol-id)
  )
)

;; Update protocol methodology
(define-public (update-protocol
  (protocol-id uint)
  (new-methodology (string-ascii 1000))
  (changes (string-ascii 500)))
  (match (map-get? protocols { protocol-id: protocol-id })
    protocol
    (begin
      (asserts! (is-eq (get created-by protocol) tx-sender) ERR_UNAUTHORIZED)

      ;; Update main protocol
      (map-set protocols
        { protocol-id: protocol-id }
        (merge protocol { methodology: new-methodology })
      )

      ;; Record version history
      (map-set protocol-versions
        { protocol-id: protocol-id, version: block-height }
        {
          changes: changes,
          updated-by: tx-sender,
          updated-at: block-height
        }
      )
      (ok true)
    )
    ERR_NOT_FOUND
  )
)

;; Deactivate protocol
(define-public (deactivate-protocol (protocol-id uint))
  (match (map-get? protocols { protocol-id: protocol-id })
    protocol
    (begin
      (asserts! (is-eq (get created-by protocol) tx-sender) ERR_UNAUTHORIZED)
      (map-set protocols
        { protocol-id: protocol-id }
        (merge protocol { is-active: false })
      )
      (ok true)
    )
    ERR_NOT_FOUND
  )
)

;; Get protocol details
(define-read-only (get-protocol (protocol-id uint))
  (map-get? protocols { protocol-id: protocol-id })
)

;; Get protocol version history
(define-read-only (get-protocol-version (protocol-id uint) (version uint))
  (map-get? protocol-versions { protocol-id: protocol-id, version: version })
)

;; Check if protocol is active
(define-read-only (is-protocol-active (protocol-id uint))
  (match (map-get? protocols { protocol-id: protocol-id })
    protocol (get is-active protocol)
    false
  )
)
