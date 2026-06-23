extern "C" {

extern unsigned char __heap_base;

static unsigned int heap_cursor = 0;

// Returns the larger of two integers without depending on the C++ standard library.
static int max_int(int a, int b) {
    return a >= b ? a : b;
}

// Computes the last LCS DP row for a prefix slice; Hirschberg uses it to score split points.
static void lcs_forward_row(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    int* out,
    int* prev,
    int* curr
) {
    for (int j = 0; j <= n; ++j) {
        prev[j] = 0;
        curr[j] = 0;
    }

    for (int i = 1; i <= m; ++i) {
        curr[0] = 0;
        for (int j = 1; j <= n; ++j) {
            if (a[i - 1] == b[j - 1]) {
                curr[j] = prev[j - 1] + 1;
            } else {
                curr[j] = max_int(prev[j], curr[j - 1]);
            }
        }
        int* swap = prev;
        prev = curr;
        curr = swap;
    }

    for (int j = 0; j <= n; ++j) out[j] = prev[j];
}

// Computes the first LCS DP row for a suffix slice; this is the reverse-direction partner of lcs_forward_row.
static void lcs_suffix_row(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    int* out,
    int* next,
    int* curr
) {
    for (int j = 0; j <= n; ++j) {
        next[j] = 0;
        curr[j] = 0;
    }

    for (int i = m - 1; i >= 0; --i) {
        curr[n] = 0;
        for (int j = n - 1; j >= 0; --j) {
            if (a[i] == b[j]) {
                curr[j] = next[j + 1] + 1;
            } else {
                curr[j] = max_int(next[j], curr[j + 1]);
            }
        }
        int* swap = next;
        next = curr;
        curr = swap;
    }

    for (int j = 0; j <= n; ++j) out[j] = next[j];
}

// Recursively reconstructs one LCS sequence using Hirschberg's divide-and-conquer split.
static int hirschberg_rec(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    unsigned char* out,
    int* work,
    int capacity_n
) {
    if (m <= 0 || n <= 0) return 0;

    if (m == 1) {
        for (int j = 0; j < n; ++j) {
            if (a[0] == b[j]) {
                out[0] = a[0];
                return 1;
            }
        }
        return 0;
    }

    if (n == 1) {
        for (int i = 0; i < m; ++i) {
            if (a[i] == b[0]) {
                out[0] = b[0];
                return 1;
            }
        }
        return 0;
    }

    const int stride = capacity_n + 1;
    int* left = work;
    int* right = work + stride;
    int* prev = work + stride * 2;
    int* curr = work + stride * 3;
    const int mid = m / 2;

    lcs_forward_row(a, mid, b, n, left, prev, curr);
    lcs_suffix_row(a + mid, m - mid, b, n, right, prev, curr);

    int split = 0;
    int best = -1;
    for (int j = 0; j <= n; ++j) {
        const int score = left[j] + right[j];
        if (score > best) {
            best = score;
            split = j;
        }
    }

    const int first = hirschberg_rec(a, mid, b, split, out, work, capacity_n);
    const int second = hirschberg_rec(a + mid, m - mid, b + split, n - split, out + first, work, capacity_n);
    return first + second;
}

// Allocates linear memory for JavaScript callers. The simple bump allocator is reset between calculations.
unsigned int wasm_alloc(unsigned int size) {
    if (heap_cursor == 0) heap_cursor = (unsigned int)&__heap_base;
    heap_cursor = (heap_cursor + 7u) & ~7u;
    const unsigned int ptr = heap_cursor;
    heap_cursor += size;
    return ptr;
}

// Resets the bump allocator to the linker-provided heap base before a new calculation.
void wasm_reset() {
    heap_cursor = (unsigned int)&__heap_base;
}

// Fills the full two-dimensional LCS DP table and returns the final LCS length.
int lcs_dp(const unsigned char* a, int m, const unsigned char* b, int n, int* dp) {
    if (!a || !b || !dp || m < 0 || n < 0) return 0;
    for (int i = 0; i <= m; ++i) dp[i * (n + 1)] = 0;
    for (int j = 0; j <= n; ++j) dp[j] = 0;

    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (a[i - 1] == b[j - 1]) {
                dp[i * (n + 1) + j] = dp[(i - 1) * (n + 1) + (j - 1)] + 1;
            } else {
                const int up = dp[(i - 1) * (n + 1) + j];
                const int left = dp[i * (n + 1) + (j - 1)];
                dp[i * (n + 1) + j] = up >= left ? up : left;
            }
        }
    }
    return dp[m * (n + 1) + n];
}

// Computes only the LCS length with two rolling rows to demonstrate the space-optimized variant.
int lcs_rolling(const unsigned char* a, int m, const unsigned char* b, int n, int* rows) {
    if (!a || !b || !rows || m < 0 || n < 0) return 0;
    int* prev = rows;
    int* curr = rows + n + 1;
    for (int j = 0; j <= n; ++j) {
        prev[j] = 0;
        curr[j] = 0;
    }

    for (int i = 1; i <= m; ++i) {
        curr[0] = 0;
        for (int j = 1; j <= n; ++j) {
            if (a[i - 1] == b[j - 1]) {
                curr[j] = prev[j - 1] + 1;
            } else {
                curr[j] = prev[j] >= curr[j - 1] ? prev[j] : curr[j - 1];
            }
        }
        int* swap = prev;
        prev = curr;
        curr = swap;
    }
    return prev[n];
}

// Public wrapper for Hirschberg sequence reconstruction; validates buffers before entering recursion.
int lcs_hirschberg(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    unsigned char* out_sequence,
    int* work,
    int capacity_n
) {
    if (!a || !b || !out_sequence || !work || m < 0 || n < 0 || capacity_n < n) return 0;
    return hirschberg_rec(a, m, b, n, out_sequence, work, capacity_n);
}

// Walks the completed DP table backwards to recover one LCS sequence and the visual backtrack path.
int lcs_backtrack(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    const int* dp,
    unsigned char* out_sequence,
    int* out_path
) {
    if (!a || !b || !dp || !out_sequence || !out_path) return 0;
    int i = m;
    int j = n;
    int path_count = 0;
    int seq_count = 0;

    while (i > 0 && j > 0) {
        out_path[path_count * 2] = i;
        out_path[path_count * 2 + 1] = j;
        ++path_count;
        if (a[i - 1] == b[j - 1]) {
            out_sequence[seq_count++] = a[i - 1];
            --i;
            --j;
        } else if (dp[(i - 1) * (n + 1) + j] >= dp[i * (n + 1) + (j - 1)]) {
            --i;
        } else {
            --j;
        }
    }

    out_path[path_count * 2] = i;
    out_path[path_count * 2 + 1] = j;
    ++path_count;

    for (int left = 0, right = seq_count - 1; left < right; ++left, --right) {
        const unsigned char temp = out_sequence[left];
        out_sequence[left] = out_sequence[right];
        out_sequence[right] = temp;
    }

    return (path_count << 16) | (seq_count & 0xffff);
}

// Constructs a shortest common supersequence from the LCS DP table and records each character's source.
int scs_construct(
    const unsigned char* a,
    int m,
    const unsigned char* b,
    int n,
    const int* dp,
    unsigned char* out_sequence,
    unsigned char* out_sources
) {
    if (!a || !b || !dp || !out_sequence || !out_sources) return 0;
    int i = m;
    int j = n;
    int count = 0;

    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            out_sequence[count] = a[i - 1];
            out_sources[count] = 0;
            --i;
            --j;
        } else if (dp[(i - 1) * (n + 1) + j] >= dp[i * (n + 1) + (j - 1)]) {
            out_sequence[count] = a[i - 1];
            out_sources[count] = 1;
            --i;
        } else {
            out_sequence[count] = b[j - 1];
            out_sources[count] = 2;
            --j;
        }
        ++count;
    }

    while (i > 0) {
        out_sequence[count] = a[i - 1];
        out_sources[count] = 1;
        --i;
        ++count;
    }

    while (j > 0) {
        out_sequence[count] = b[j - 1];
        out_sources[count] = 2;
        --j;
        ++count;
    }

    for (int left = 0, right = count - 1; left < right; ++left, --right) {
        const unsigned char c = out_sequence[left];
        out_sequence[left] = out_sequence[right];
        out_sequence[right] = c;
        const unsigned char s = out_sources[left];
        out_sources[left] = out_sources[right];
        out_sources[right] = s;
    }

    return count;
}

// Exponential reference implementation used only for very small inputs as a correctness comparison.
int lcs_bruteforce_length(const unsigned char* a, int m, const unsigned char* b, int n) {
    if (!a || !b || m <= 0 || n <= 0) return 0;
    if (a[m - 1] == b[n - 1]) return 1 + lcs_bruteforce_length(a, m - 1, b, n - 1);
    const int x = lcs_bruteforce_length(a, m - 1, b, n);
    const int y = lcs_bruteforce_length(a, m, b, n - 1);
    return x >= y ? x : y;
}

}
