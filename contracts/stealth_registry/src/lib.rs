#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Bytes, Env, Vec, Symbol,
    symbol_short,
};

const COUNT_KEY: Symbol = symbol_short!("COUNT");

#[contracttype]
#[derive(Clone, Debug)]
pub struct Announcement {
    pub id:              u32,
    pub stealth_address: Bytes,
    pub ephemeral_r:     Bytes,
    pub sender:          Address,
    pub timestamp:       u64,
}

#[contract]
pub struct StealthRegistry;

#[contractimpl]
impl StealthRegistry {
    /// Post a new stealth-address announcement.
    /// `sender` must authorise the call (Freighter signs this).
    pub fn announce(
        env: Env,
        sender: Address,
        stealth_address: Bytes,
        ephemeral_r: Bytes,
    ) -> u32 {
        sender.require_auth();

        let count: u32 = env.storage().persistent().get(&COUNT_KEY).unwrap_or(0);

        let ann = Announcement {
            id: count,
            stealth_address: stealth_address.clone(),
            ephemeral_r: ephemeral_r.clone(),
            sender,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&count, &ann);
        env.storage().persistent().set(&COUNT_KEY, &(count + 1));

        env.events().publish(
            (symbol_short!("announce"),),
            (count, stealth_address, ephemeral_r),
        );

        count
    }

    /// Total number of announcements ever posted.
    pub fn get_count(env: Env) -> u32 {
        env.storage().persistent().get(&COUNT_KEY).unwrap_or(0)
    }

    /// Paginated read — returns up to 50 announcements starting at `from`.
    pub fn get_announcements(env: Env, from: u32, count: u32) -> Vec<Announcement> {
        let total: u32 = env.storage().persistent().get(&COUNT_KEY).unwrap_or(0);
        let limit = count.min(50);
        let mut results: Vec<Announcement> = Vec::new(&env);
        let end = (from + limit).min(total);
        for i in from..end {
            if let Some(ann) = env.storage().persistent().get::<u32, Announcement>(&i) {
                results.push_back(ann);
            }
        }
        results
    }

    /// Fetch a single announcement by id.
    pub fn get_announcement(env: Env, id: u32) -> Option<Announcement> {
        env.storage().persistent().get(&id)
    }
}
