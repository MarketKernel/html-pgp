Made once by `tools/gnupg-fixtures.sh` with the GnuPG in `VERSION`, and committed: these are
fixed vectors — what GnuPG (and so Kleopatra) writes — and are never regenerated to make a test
pass. Throwaway test keys; their passphrases are in the script: `alice passphrase`,
`bob passphrase`, and `correct horse battery staple` for `symmetric.asc`.
