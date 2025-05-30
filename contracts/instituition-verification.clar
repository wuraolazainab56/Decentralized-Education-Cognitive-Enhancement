;; Institution Verification Contract
;; Validates cognitive enhancement providers

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ALREADY_VERIFIED (err u101))
(define-constant ERR_NOT_FOUND (err u102))
(define-constant ERR_INVALID_STATUS (err u103))

;; Institution status types
(define-constant STATUS_PENDING u0)
(define-constant STATUS_VERIFIED u1)
(define-constant STATUS_SUSPENDED u2)
(define-constant STATUS_REVOKED u3)

;; Data structures
(define-map institutions
  { institution-id: uint }
  {
    name: (string-ascii 100),
    address: principal,
    status: uint,
    verification-date: uint,
    credentials: (string-ascii 500),
    contact-info: (string-ascii 200)
  }
)

(define-map institution-counter principal uint)
(define-data-var next-institution-id uint u1)

;; Register a new institution
(define-public (register-institution
  (name (string-ascii 100))
  (credentials (string-ascii 500))
  (contact-info (string-ascii 200)))
  (let ((institution-id (var-get next-institution-id)))
    (map-set institutions
      { institution-id: institution-id }
      {
        name: name,
        address: tx-sender,
        status: STATUS_PENDING,
        verification-date: u0,
        credentials: credentials,
        contact-info: contact-info
      }
    )
    (map-set institution-counter tx-sender institution-id)
    (var-set next-institution-id (+ institution-id u1))
    (ok institution-id)
  )
)

;; Verify an institution (only contract owner)
(define-public (verify-institution (institution-id uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (match (map-get? institutions { institution-id: institution-id })
      institution
      (begin
        (map-set institutions
          { institution-id: institution-id }
          (merge institution {
            status: STATUS_VERIFIED,
            verification-date: block-height
          })
        )
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Update institution status
(define-public (update-institution-status (institution-id uint) (new-status uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (<= new-status STATUS_REVOKED) ERR_INVALID_STATUS)
    (match (map-get? institutions { institution-id: institution-id })
      institution
      (begin
        (map-set institutions
          { institution-id: institution-id }
          (merge institution { status: new-status })
        )
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Get institution details
(define-read-only (get-institution (institution-id uint))
  (map-get? institutions { institution-id: institution-id })
)

;; Check if institution is verified
(define-read-only (is-institution-verified (institution-id uint))
  (match (map-get? institutions { institution-id: institution-id })
    institution (is-eq (get status institution) STATUS_VERIFIED)
    false
  )
)

;; Get institution by address
(define-read-only (get-institution-by-address (address principal))
  (match (map-get? institution-counter address)
    institution-id (get-institution institution-id)
    none
  )
)
