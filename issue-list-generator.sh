# Script Name: issue-list-generator.sh
# Description: Generates a list of issues from a specified GitHub repository and formats them for Confluence.

# Requires:
# - gh: GitHub CLI (https://github.com/cli/cli)
# - jq: Command-line JSON processor (https://github.com/stedolan/jq)

# Usage:
# sh ./issue-list-generator.sh -d "<default_charge_account>" -i "<improvement_charge_account>" -f "<defect_charge_account>"
# Then in the confluence page, insert markup and select "Confluence Wiki" as the format and paste the output.

# Notes:
# - Ensure you have the necessary permissions to access the GitHub repository.
# - Customize the REPO, MILESTONE_NUMBERS, and LABELS variables as needed.


# Change as needed
REPO="NASA-AMMOS/openmct-mcws"
MILESTONE_NUMBERS=("11")
MILESTONE_TITLES=() # will be populated with titles mapped to milestone nnumbers
LABELS=("commitment" "improvement" "defect" "sustaining" "other")

# Default charge accounts
CHARGE_ACCOUNT_DEFAULT="N/A"
CHARGE_ACCOUNT_IMPROVEMENT="N/A"
CHARGE_ACCOUNT_DEFECT="N/A"

# Parse command-line arguments
while getopts "d:i:f:" opt; do
  case $opt in
    d) CHARGE_ACCOUNT_DEFAULT="$OPTARG"
    ;;
    i) CHARGE_ACCOUNT_IMPROVEMENT="$OPTARG"
    ;;
    f) CHARGE_ACCOUNT_DEFECT="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
        exit 1
    ;;
  esac
done

# Fetch and store milestone titles from their numbers
for i in "${!MILESTONE_NUMBERS[@]}"; do
    MILESTONE_TITLES[$i]=$(gh api repos/$REPO/milestones/${MILESTONE_NUMBERS[$i]} --jq '.title' -H "Accept: application/vnd.github.v3+json")
done

# Get the heading based on the label
get_heading() {
    case $1 in
        "commitment")
            echo "Requirements"
            ;;
        "improvement")
            echo "Improvements"
            ;;
        "defect")
            echo "Defect Repairs"
            ;;
        "sustaining")
            echo "Sustaining Activities"
            ;;
        "other")
            echo "Other"
            ;;
        *)
            echo "Uknown"
            ;;
    esac
}

# Get Release Version by milestone
get_release() {
    case $1 in
        "11")
            echo "MC 2512 Point Release 1"
            ;;
        "12")
            echo "MC 2512 Point Release 2"
            ;;
        "13")
            echo "MC 2512 Point Release 3"
            ;;
        *)
            echo "Uknown"
            ;;
    esac
}

# Function to extract a variable from the issue body
extract_variable() {
    local var_name=$1
    local issue_body=$2
    local value=$(echo "$issue_body" | sed -n "s/.*\$\$$var_name:\(.*\).*/\1/p" | tr -d '\n' | tr -d '\r')

    if [[ "$var_name" == "ask" && -n "$value" ]]; then
        echo "[ASK-$value|https://jira.jpl.nasa.gov/browse/ASK-$value]"
    elif [[ "$var_name" == "mcr" && -n "$value" ]]; then
        echo "[MCR-$value|https://jira.jpl.nasa.gov/browse/MCR-$value]"
    elif [[ -n "$value" ]]; then
        echo "$value"
    elif [[ "$var_name" == "ask" || "$var_name" == "mcr" ]]; then
        echo ""
    else
        echo "N/A"
    fi
}

# List issues for a specific label and format as a Confluence wiki table
list_issues() {
    local label=$1
    local heading=$(get_heading $label)
    local columns
    local jq_filter='.[] | @base64'

    # Constructing the milestone part of the URL
    local milestone_part=""
    for i in "${!MILESTONE_TITLES[@]}"; do
        if [[ -n "$milestone_part" ]]; then
            milestone_part+=","
        fi
        milestone_part+="\"${MILESTONE_TITLES[$i]}\""
    done

    # Loop through provided milestones and pool the issues
    local issues=""
    for i in "${!MILESTONE_NUMBERS[@]}"; do
        local milestone_number=${MILESTONE_NUMBERS[i]}
        local issue_data=$(gh issue list --repo "$REPO" --milestone "$milestone_number" --label "$label" --state all --json number,title,url,labels,body --jq "$jq_filter")
        local planned_release=$(get_release $milestone_number)

        while IFS= read -r line; do
            # Check if no issue
            if [ -z "$line" ]; then
                break
            fi

            local issue_body=$(echo "$line" | base64 --decode | jq '.body')
            local issue_number=$(echo "$line" | base64 --decode | jq -r '.number')
            local issue_title=$(echo "$line" | base64 --decode | jq -r '.title')
            local issue_url=$(echo "$line" | base64 --decode | jq -r '.url')
            local ask=$(extract_variable "ask" "$issue_body")
            local mcr=$(extract_variable "mcr" "$issue_body")
            local related_issue=$(printf '%s%s%s' "$ask" "${ask:+${mcr:+, }}$mcr")
            local rationale=$(extract_variable "rationale" "$issue_body")
            local reporter=$(extract_variable "reporter" "$issue_body")
            local estimated_hours=$(extract_variable "estimate" "$issue_body")
            local requester=$(extract_variable "requester" "$issue_body")
            local doc_id=$(extract_variable "docid" "$issue_body")
            local issue_labels=$(echo "$line" | base64 --decode | jq -r '.labels | map(.name) | join(", ")')
            local criticality=$(echo "$issue_labels" | grep -o 'crit-[1-4]' | sed 's/crit-//' || echo "N/A")
            criticality=${criticality:-N/A}
            local is_security_related="n"
            if [[ $issue_labels == *"security"* ]]; then
                is_security_related="y"
            fi

            # Select charge account based on label
            local charge_account=$CHARGE_ACCOUNT_DEFAULT
            if [[ "$label" == "improvement" ]]; then
                charge_account=$CHARGE_ACCOUNT_IMPROVEMENT
            elif [[ "$label" == "defect" ]]; then
                charge_account=$CHARGE_ACCOUNT_DEFECT
            fi

            # Define columns and extract variables based on label
            case $label in
                "commitment")
                    columns="|| *ID* || *Title* || *Rational/Issue (PRS/ASK/MCR)* || *Rationale* || *Requester/Reporter* || *Estimated Hours* || *Charge Account* || *Security Related (y/n)* || *Release Version* ||"
                    issues="| [$issue_number|$issue_url] | $issue_title | ${related_issue} | ${rationale} | ${reporter} | ${estimated_hours} | ${charge_account} | ${is_security_related} | ${planned_release} |\n$issues"
                    ;;
                "improvement")
                    columns="|| *ID* || *Title* || *Rational/Issue (PRS/ASK/MCR)* || *Requester/Reporter* || *Estimated Hours* || *Charge Account* || *Security Related (y/n)* || *Release Version* ||"
                    issues="| [$issue_number|$issue_url] | $issue_title | ${related_issue} | ${reporter} | ${estimated_hours} | ${charge_account} | ${is_security_related} | ${planned_release} |\n$issues"
                    ;;
                "defect")
                    columns="|| *ID* || *Title* || *Rational/Issue (PRS/ASK/MCR)* || *Requester/Reporter* || *Estimated Hours* || *Charge Account* || *Security Related (y/n)* || *Criticality* || *Release Version* ||"
                    issues="| [$issue_number|$issue_url] | $issue_title | ${related_issue} | ${reporter} | ${estimated_hours} | ${charge_account} | ${is_security_related} | ${criticality} | ${planned_release} |\n$issues"
                    ;;
                "sustaining")
                    columns="|| *ID* || *Title* || *Rational/Issue (PRS/ASK/MCR)* || *Requester/Reporter* || *Estimated Hours* || *Charge Account* || *Security Related (y/n)* || *Release Version* ||"
                    issues="| [$issue_number|$issue_url] | $issue_title | ${rationale} | ${requester} | ${estimated_hours} | ${charge_account} | ${is_security_related} | ${planned_release} |\n$issues"
                    ;;
                "other")
                    columns="|| *ID* || *Title* || *Doc-id* || *Requester/Reporter* || *Estimated Hours* || *Charge Account* || *Security Related (y/n)* || *Release Version* ||"
                    issues="| [$issue_number|$issue_url] | $issue_title | ${doc_id} | ${requester} | ${estimated_hours} | ${charge_account} | ${is_security_related} | ${planned_release} |\n$issues"
                    ;;
            esac
        done <<< "$issue_data"

    done

    echo "h3. $heading"
    echo "*Repository*: [openmct-mcws|https://github.com/NASA-AMMOS/openmct-mcws]"

    if [[ -z "$issues" ]]; then
        echo None.
    else
        echo "$columns"
        echo "$issues"
    fi
    echo
}

# Main Script
for label in "${LABELS[@]}"; do
    list_issues "$label"
done
