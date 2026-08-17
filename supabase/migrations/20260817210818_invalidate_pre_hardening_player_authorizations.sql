-- Authorizations issued before the strict verifier was installed cannot be
-- distinguished from passcode-backed approvals. Require every non-host player
-- to verify again under the hardened contract.
delete from private.player_add_authorizations;
