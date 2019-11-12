INVESTORS = "investors"
TOTAL_COLLECTED = "total_collected"
TOTAL_NEEDED = "total_needed"
VALUE = "value"
ID = "id"


def match(loans, investors):
    matches = {}

    process_loan(loans, investors, iter(loans), matches)
    return matches


def process_loan(loans, investors, loan_iter, matches):

    loan_key = get_next(loan_iter)
    if loans.get(loan_key) and loans[loan_key] != 0:
        matches[loan_key] = {INVESTORS: [], TOTAL_NEEDED: loans[loan_key], TOTAL_COLLECTED: 0}
        match_investor(loans, investors, loan_key, iter(investors), matches)
        if matches[loan_key][TOTAL_COLLECTED] != matches[loan_key][TOTAL_NEEDED]:
            del matches[loan_key]
        process_loan(loans, investors, loan_iter, matches)


def match_investor(loans, investors, loan_key, investment_iter, matches):

    investment_key = get_next(investment_iter)
    if investors.get(investment_key) and investors[investment_key] != 0 and loans[loan_key] != 0:
        if loans[loan_key] <= investors[investment_key]:
            matches[loan_key][INVESTORS].append({ID: investment_key, VALUE: loans[loan_key]})
            matches[loan_key][TOTAL_COLLECTED] = matches[loan_key][TOTAL_COLLECTED] + loans[loan_key]
            investors[investment_key] = investors[investment_key] - loans[loan_key]
            loans[loan_key] = 0
        else:
            matches[loan_key][INVESTORS].append({ID: investment_key, VALUE: investors[investment_key]})
            matches[loan_key][TOTAL_COLLECTED] = matches[loan_key][TOTAL_COLLECTED] + investors[investment_key]
            loans[loan_key] = loans[loan_key] - investors[investment_key]
            investors[investment_key] = 0
        match_investor(loans, investors, loan_key, investment_iter, matches)


def get_next(iterator):

    try:
        key = next(iterator)
    except StopIteration:
        key = -1

    return key


for k, v in match(
        {1: 1000, 2: 2000, 3: 2500, 4: 1500, 5: 2000, 6: 1000, 7: 500},
        {1: 10000, 2: 20000, 3: 150000}).items():
    print(k, v)

print("")

for k, v in match(
        {1: 10000, 2: 20000, 3: 150000},
        {1: 1000, 2: 2000, 3: 2500, 4: 1500, 5: 2000, 6: 1000, 7: 500}).items():
    print(k, v)
